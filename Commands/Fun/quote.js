const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Get a random inspirational quote."),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const { data } = await axios.get("https://api.quotable.io/random");
      const embed = new EmbedBuilder()
        .setTitle("💬 Quote")
        .setDescription(`“${data.content}”\n— ${data.author}`)
        .setColor("Blue");

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Quote API error:", error);
      await interaction.editReply("Could not fetch a quote at the moment.");
    }
  },
};
