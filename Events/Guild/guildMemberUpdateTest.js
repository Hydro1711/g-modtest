const { AuditLogEvent } = require('discord.js');
const MuteRoleDB = require('../../Schemas/muteRole');
const MutedList = require('../../Schemas/mutedList');
const updateMutedListMessage = require('../../Functions/updateMutedListMessage');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    try {
      const guild = newMember?.guild;
      if (!guild) return;

      // Ensure we have old member data
      if (!oldMember || !oldMember.roles) {
        oldMember = await guild.members.fetch(newMember.id).catch(() => null);
        if (!oldMember) return;
      }

      // Get mute role from DB
      const muteData = await MuteRoleDB.findOne({ Guild: guild.id });
      if (!muteData?.RoleID) return;

      const muteRoleId = muteData.RoleID;
      const hadMuteRole = oldMember.roles.cache.has(muteRoleId);
      const hasMuteRole = newMember.roles.cache.has(muteRoleId);

      // No change in mute role
      if (hadMuteRole === hasMuteRole) return;

      // Fetch audit log to find who applied/removed the role
      let executor = null;
      try {
        const fetchedLogs = await guild.fetchAuditLogs({
          limit: 3,
          type: AuditLogEvent.MemberRoleUpdate,
        });
        const logEntry = [...fetchedLogs.entries.values()].find(e => e.target.id === newMember.id);
        if (logEntry) executor = logEntry.executor;
      } catch (err) {
        console.error('[AUDIT] Failed to fetch audit logs:', err);
      }

      // Ignore changes made by this bot
      if (executor?.id === client.user.id) return;

      // ===== MUTE ROLE ADDED =====
if (!hadMuteRole && hasMuteRole) {
  console.log(`[EXTERNAL_MUTE] ${newMember.user.tag} received mute role externally.`);

  const existing = await MutedList.findOne({ guildId: guild.id, userId: newMember.id });
  if (!existing) {
    await MutedList.create({
      guildId: guild.id,
      userId: newMember.id,
      moderatorId: 'External/Unknown', // always mark as external
      reason: 'Muted externally or by another bot', // always this reason
      mutedAt: new Date(),
    }).catch(console.error);

    try {
      await updateMutedListMessage(guild);
    } catch (err) {
      console.error(`[EXTERNAL_MUTE] Failed to update muted list message:`, err);
    }
  }
}

      // ===== MUTE ROLE REMOVED =====
      if (hadMuteRole && !hasMuteRole) {
        console.log(`[EXTERNAL_UNMUTE] ${newMember.user.tag} had mute role removed externally.`);

        const existing = await MutedList.findOne({ guildId: guild.id, userId: newMember.id });
        if (existing) {
          await MutedList.deleteOne({ guildId: guild.id, userId: newMember.id }).catch(console.error);

          try {
            await updateMutedListMessage(guild);
          } catch (err) {
            console.error(`[EXTERNAL_UNMUTE] Failed to update muted list message:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[FATAL] guildMemberUpdate crashed:', err);
    }
  },
};
