const ColorRole = require("../../Schemas/colorRoles");

module.exports = {
  name: "messageReactionRemove",
  async execute(reaction, user, client) {
    try {
      if (user.bot) return;

      if (reaction.partial) {
        try { await reaction.fetch(); }
        catch (err) { console.error(`[ColorRoles][Remove] Failed to fetch reaction:`, err); return; }
      }

      const { message, emoji } = reaction;
      const guild = message.guild;
      if (!guild) return;

      const data = await ColorRole.findOne({ guildId: guild.id });
      if (!data || data.messageId !== message.id) return;

      const roleEntry = data.roles.find(r => r.emoji === emoji.name);
      if (!roleEntry) return;

      const member = await guild.members.fetch(user.id);
      const role = guild.roles.cache.get(roleEntry.roleId);
      if (!role) return;

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        console.log(`[ColorRoles] Removed role ${role.name} from ${user.tag} in guild ${guild.id}`);
        await user.send(`❌ Your role **${role.name}** has been removed.`);
      }
    } catch (err) {
      console.error(`[ColorRoles][Remove] Error:`, err);
    }
  }
};
