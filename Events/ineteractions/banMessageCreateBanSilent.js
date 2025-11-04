// events/messageCreate.js
const { PermissionsBitField } = require('discord.js');
const config = require('../../config.json'); // adjust path if needed

module.exports = {
  name: 'messageCreate',
  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      const content = message.content.trim();

      // Only react to "taxx!ban ..." exactly
      if (!content.toLowerCase().startsWith('mod!ban')) return;

      // ✅ Developer-only check
      if (message.author.id !== config.DeveloperID) {
        return message.delete().catch(() => {});
      }

      // Split into [command, user, ...reason]
      const args = content.split(/\s+/);
      if (args.length < 2) {
        return message.delete().catch(() => {});
      }

      const targetArg = args[1];
      const reason = args.slice(2).join(' ') || 'Geen reden opgegeven';

      // Try to resolve target: mention OR userID
      let targetMember =
        message.mentions.members.first() ||
        (await message.guild.members.fetch(targetArg).catch(() => null));

      if (!targetMember) {
        return message.delete().catch(() => {});
      }

      // Permission checks
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.delete().catch(() => {});
      }
      if (!targetMember.bannable) {
        return message.delete().catch(() => {});
      }

      // Silent ban (no DM, no public output)
      await targetMember.ban({
        reason: `${reason} — Banned by ${message.author.tag}`,
      });

      // Delete the command message for silence
      await message.delete().catch(() => {});
    } catch (err) {
      console.error('Error in taxx!ban handler:', err);
    }
  },
};
