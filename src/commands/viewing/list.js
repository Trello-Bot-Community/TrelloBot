const Command = require('../../structures/Command');
const GenericPager = require('../../structures/GenericPager');
const Util = require('../../util');

module.exports = class List extends Command {
  get name() { return 'list'; }

  get _options() { return {
    aliases: ['viewlist', 'cards', 'vl'],
    cooldown: 2,
    permissions: ['embed', 'auth', 'selectedBoard']
  }; }

  async exec(message, { args, _, trello, userData }) {
    const handle = await trello.handleResponse({
      response: await trello.getAllLists(userData.currentBoard),
      client: this.client, message, _ });
    if (handle.stop) return;
    if (await Util.Trello.ensureBoard(handle, message, _)) return;

    const json = handle.body;
    const list = await Util.Trello.findList(args[0], json, this.client, message, _);
    if (!list) return;

    const emojiFallback = Util.emojiFallback({ client: this.client, message });
    const checkEmoji = emojiFallback('632444546684551183', '☑️');
    const uncheckEmoji = emojiFallback('632444550115491910', '⬜');

    if (list.cards.length) {
      const paginator = new GenericPager(this.client, message, {
        items: list.cards,
        _, header: (list.closed ? `🗃️ **${_('words.arch_list.one')}**\n\n` : '') +
          `**${_('words.list.one')}:** ${Util.cutoffText(Util.Escape.markdown(list.name), 50)}\n` +
          `**${_('words.id')}:** \`${list.id}\`\n` +
          `${list.subscribed ? checkEmoji : uncheckEmoji} ${_('trello.subbed')}\n\n` +
          _('lists.list_header'), itemTitle: 'words.card.many',
        display: (item) => `${item.closed ? '🗃️ ' : ''}${item.subscribed ? '🔔 ' : ''}\`${item.shortLink}\` ${
          Util.cutoffText(Util.Escape.markdown(item.name), 50)}`
      });

      if (args[1])
        paginator.toPage(args[1]);

      return paginator.start(message.channel.id, message.author.id);
    } else {
      const embed = {
        title: Util.cutoffText(Util.Escape.markdown(list.name), 256),
        color: this.client.config.embedColor,
        description: (list.closed ? `🗃️ **${_('words.arch_list.one')}**\n\n` : '') +
          `**${_('words.id')}:** \`${list.id}\`\n` +
          `${list.subscribed ? checkEmoji : uncheckEmoji} ${_('trello.subbed')}\n\n` +
          _('lists.list_none')
      };
      return message.channel.createMessage({ embed });
    }
  }

  get metadata() { return {
    category: 'categories.view',
  }; }
};