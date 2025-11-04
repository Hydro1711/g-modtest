const Blacklist = require('../../Schemas/blacklist');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban) {
    try {
      const { guild, user } = ban;
      const entry = await Blacklist.findOne({ userId: user.id });
      if (!entry) return;

      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        console.log(`[NO PERMS] Could not re-ban ${user.tag} in ${guild.name}`);
        return;
      }

      await guild.members.ban(user.id, { reason: `Blacklisted user re-banned automatically: ${entry.reason}` });
      console.log(`[REBANNED] Blacklisted user ${user.tag} in ${guild.name}`);
    } catch (err) {
      console.error(`[ERROR] guildBanRemove handler:`, err);
    }
  },
};
