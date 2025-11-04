const AfkModel = require("../../Schemas/afk.js");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const botMember = message.guild.members.me;

    try {
      const afkData = await AfkModel.findOne({ guildId, userId });
      if (!afkData) return;

      await AfkModel.deleteOne({ guildId, userId });

      const member = message.member;
      if (botMember.permissions.has("ManageNicknames") && member.manageable && member.displayName.startsWith("[AFK] ")) {
        try {
          const newName = member.displayName.replace("[AFK] ", "");
          await member.setNickname(newName);
        } catch {}
      }

      await message.reply(`Welcome back, <@${userId}>! I removed your AFK status.`);
    } catch (err) {
      console.error("Error removing AFK:", err);
    }
  },
};
