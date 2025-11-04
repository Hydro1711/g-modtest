const { Events } = require('discord.js');
const Spy = require('../../Schemas/spy');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
      const spyEntry = await Spy.findOne({ guildId: message.guild.id });
      if (!spyEntry) return;

      const logChannel = await message.client.channels.fetch(spyEntry.logChannelId).catch(() => null);
      if (!logChannel) return console.error(`[SPY] Log channel not found for guild ${message.guild.id}`);

      await logChannel.send({
        content: `**[${message.author.tag}](${message.url})** (<@${message.author.id}>): ${message.content || '[No text content]'}`,
      });
    } catch (err) {
      console.error('[SPY] Failed to log message:', err);
    }
  },
};
