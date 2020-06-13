/*
 This file is part of TrelloBot.
 Copyright (c) Snazzah 2016 - 2019
 Copyright (c) Trello Talk Team 2019 - 2020

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

exports.name = 'UPDATE_COMMENT';

exports.exec = async data => {
  const _ = data.localeModule;
  return data.send({
    title: _('webhooks.update_comment', {
      member: data.invoker.webhookSafeName,
      card: data.util.cutoffText(data.card.name, 50)
    }),
    description: data.embedDescription(['card', 'list']),
    fields: [{
      name: '*' + _('trello.old_comment') + '*',
      value: data.util.cutoffText(data.oldData.text, 1024),
      inline: true
    }, {
      name: '*' + _('trello.new_comment') + '*',
      value: data.util.cutoffText(data.action.data.action.text, 1024),
      inline: true
    }]
  });
};