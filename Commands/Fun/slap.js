const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slap")
    .setDescription("Slap someone 😳")
    .addUserOption(option =>
      option.setName("user").setDescription("Who do you want to slap?").setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    if (user.id === interaction.user.id)
      return interaction.reply({ content: "Why would you slap yourself? 😅", ephemeral: true });

    try {
      const res = await axios.get("https://nekos.best/api/v2/slap");
      const gif = res.data.results[0].url;

      const embed = new EmbedBuilder()
        .setDescription(`**${interaction.user.username}** slaps **${user.username}** 😳`)
        .setImage(gif)
        .setColor("Red");

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: "Couldn't fetch a slap image right now 😔", ephemeral: true });
    }
  },
};
