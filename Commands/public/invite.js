const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Sends an invite link for the bot."),
  async execute(interaction) {
    const client = interaction.client;

    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=${PermissionFlagsBits.Administrator}&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setTitle("Invite Me")
      .setDescription(`[Click here to invite ${client.user.username}](${inviteLink})`)
      .setColor("Blue")
      .setFooter({ text: "Invite Link" });

    await interaction.reply({ embeds: [embed] });
  },
};
