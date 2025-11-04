const ColorRole = require("../../Schemas/colorRoles");

module.exports = {
  name: "messageReactionAdd",
  async execute(reaction, user, client) {
    try {
      if (user.bot) return;

      if (reaction.partial) {
        try { await reaction.fetch(); }
        catch (err) { console.error(`[ColorRoles][Add] Failed to fetch reaction:`, err); return; }
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

      const existingRole = data.roles.find(r => member.roles.cache.has(r.roleId));

      if (existingRole && existingRole.roleId !== role.id) {
        await reaction.users.remove(user.id);
        console.log(`[ColorRoles] ${user.tag} tried to add a second color role in guild ${guild.id}. Reaction removed.`);
        await user.send(`❌ You can only have **one color role**. Your reaction for ${emoji.name} was removed.`);
        return;
      }

      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        console.log(`[ColorRoles] Added role ${role.name} to ${user.tag} in guild ${guild.id}`);
        await user.send(`✅ You have been given the role **${role.name}**.`);
      }
    } catch (err) {
      console.error(`[ColorRoles][Add] Error:`, err);
    }
  }
};
