const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Show the bot’s current latency."),
  async execute(interaction) {
    const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .setColor("Blue")
      .addFields(
        { name: "Bot Latency", value: `${latency}ms`, inline: true },
        { name: "API Latency", value: `${apiPing}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: "", embeds: [embed] });
  },
};
