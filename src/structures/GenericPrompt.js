/*
 This file is part of TrelloBot.
 Copyright (c) Snazzah (and contributors) 2016-2020

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
const EventEmitter = require('eventemitter3');
const GenericPager = require('./GenericPager');
const Paginator = require('./Paginator');

/**
 * A generic pager that shows a list of items
 */
class GenericPrompt extends EventEmitter {
  /**
   * @param {TrelloBot} client The client to use
   * @param {Message} message The user's message to read permissions from
   * @param {Object} pagerOptions The options for the pager
   */
  constructor(client, message, pagerOptions = {}) {
    super();
    this.client = client;
    this.message = message;
    this.pagerOptions = pagerOptions;
    this.displayFunc = pagerOptions.display || ((item) => item.toString());

    // Override some pager options
    this.pagerOptions.display = (item, i, ai) => `${ai + 1}. ${this.displayFunc(item, i, ai)}`;
    this.pagerOptions.header = pagerOptions.header || pagerOptions._('prompt.choose');
    this.pagerOptions.footer = (pagerOptions.footer ? pagerOptions.footer + '\n\n' : '') +
      pagerOptions._('prompt.cancel');
    this.pagerOptions.embedExtra = this.pagerOptions.embedExtra || {};
    this.pagerOptions.embedExtra.author = {
      name: `${message.author.username}#${message.author.discriminator}`,
      icon_url: message.author.avatarURL || message.author.defaultAvatarURL
    };

    this.pager = new GenericPager(client, message, this.pagerOptions);
    this.halt = null;
  }

  /**
   * Starts the prompt
   * @param {string} channelID The channel to post the new message to
   * @param {string} userID The user's ID that started the process
   * @param {number} timeout
   */
  async choose(channelID, userID, timeout) {
    await this.pager.start(channelID, userID, timeout);
    this.halt = this.client.messageAwaiter.createHalt(channelID, userID, timeout);

    // Sync timeouts
    if (this.pager.collector)
      this.pager.collector.restart();
    this.halt.restart();

    return new Promise(resolve => {
      let foundItem = null;

      this.halt.on('message', nextMessage => {
        if (GenericPrompt.CANCEL_TRIGGERS.includes(nextMessage.content.toLowerCase())) {
          foundItem = { _canceled: true };
          this.halt.end();
        }
        const chosenIndex = parseInt(nextMessage.content);
        if (chosenIndex <= 0) return;
        const chosenItem = this.pager.items[chosenIndex - 1];
        if (chosenItem !== undefined) {
          foundItem = chosenItem;
          this.halt.end();
        }
      });

      this.halt.on('end', () => {
        // In case the halt ends before reactions are finished coming up
        this.pager.reactionsCleared = true;
        this.pager.collector.end();
        this.pager.message.delete();

        if (foundItem && foundItem._canceled)
          foundItem = null;
        else if (foundItem === null)
          this.pager.message.channel.createMessage(
            `<@${userID}>, ${this.pagerOptions._('prompt.timeout')}`);

        resolve(foundItem);
      });

      if (this.pager.collector)
        this.pager.collector.on('reaction', emoji => {
          if (Paginator.STOP == emoji.name) {
            foundItem = { _canceled: true };
            this.halt.end();
          }
        });
    });
  }
}

GenericPrompt.CANCEL_TRIGGERS = [
  'c', 'cancel', 's', 'stop'
];

module.exports = GenericPrompt;