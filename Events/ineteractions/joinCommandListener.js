const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const SecretPeople = require("../../Schemas/secretPeople.js");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();
    if (contentLower !== "taxx!join" && contentLower !== "taxx! join") return;

    const userId = message.author.id;
    const permissions = message.channel.permissionsFor(message.guild.members.me);

    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) return;

    const member = message.member;
    if (!member.voice.channel) {
      const noVcMsg = await message.channel.send(`<@${userId}>, you must be in a voice channel to use this command.`);
      setTimeout(() => noVcMsg.delete().catch(() => {}), 3000);
      return;
    }

    const secretData = await SecretPeople.findOne({});
    const secretUser = secretData?.secretUsers.includes(userId);
    if (!secretUser) {
      const denyMsg = await message.channel.send(`<@${userId}>, you are not allowed to use this command.`);
      setTimeout(() => denyMsg.delete().catch(() => {}), 3000);
      return;
    }

    const developerId = client.config.DeveloperID;
    const developerMember = await message.guild.members.fetch(developerId).catch(() => null);
    if (!developerMember || !developerMember.voice.channel) {
      const devNoVcMsg = await message.channel.send(`<@${userId}>, the developer is not in a voice channel right now.`);
      setTimeout(() => devNoVcMsg.delete().catch(() => {}), 3000);
      return;
    }

    try {
      await member.voice.setChannel(developerMember.voice.channel);
      const embed = new EmbedBuilder()
        .setTitle("Welcome!")
        .setDescription(`Hello <@${userId}>, you successfully joined the developer's voice channel! 🎉`)
        .setColor("Random");

      const sentMsg = await message.channel.send({ embeds: [embed] });
      setTimeout(() => sentMsg.delete().catch(() => {}), 3000);
    } catch (err) {
      console.error("❌ Failed to move user:", err);
    }
  },
};
