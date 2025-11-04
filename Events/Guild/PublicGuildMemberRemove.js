const { EmbedBuilder } = require("discord.js");
const WelcomeLeave = require("../../Schemas/welcomeLeave");

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    try {
      const data = await WelcomeLeave.findOne({ guildId: member.guild.id });
      if (!data?.leaveChannelId) return;

      const channel = member.guild.channels.cache.get(data.leaveChannelId);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("👋 Goodbye")
        .setDescription(`${member.user.tag} has left **${member.guild.name}**.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[guildMemberRemove] Error sending leave message:", err);
    }
  },
};
