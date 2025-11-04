const Blacklist = require('../../Schemas/blacklist');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'guildCreate',
  async execute(guild) {
    console.log(`[GUILD JOIN] Joined server: ${guild.name} (${guild.id})`);
    try {
      const entries = await Blacklist.find({});
      console.log(`[GUILD JOIN] Found ${entries.length} blacklisted users in DB`);

      if (!entries.length) return;

      for (const entry of entries) {
        const member = await guild.members.fetch(entry.userId).catch(() => null);
        if (!member) {
          console.log(`[GUILD JOIN] Blacklisted user ID ${entry.userId} not found in ${guild.name}`);
          continue;
        }

        const owner = await guild.fetchOwner().catch(() => null);

        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
          console.log(`[NO PERMS] Cannot ban ${member.user.tag} in ${guild.name}`);
          if (owner) console.log(`[OWNER NOTICE] ${owner.user.tag} should ban ${member.user.tag} manually`);
          continue;
        }

        await member.ban({ reason: entry.reason });
        console.log(`[BANNED] Blacklisted user ${member.user.tag} in new server ${guild.name}`);

        if (owner) {
          console.log(`[OWNER NOTICE] Sent DM to ${owner.user.tag} about banned blacklisted user ${member.user.tag}`);
        }
      }
    } catch (err) {
      console.error(`[ERROR] guildCreate handler:`, err);
    }
  },
};
