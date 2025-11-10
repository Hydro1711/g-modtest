const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("Kiss someone 💕")
    .addUserOption(option =>
      option.setName("user").setDescription("Who do you want to kiss?").setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    if (user.id === interaction.user.id)
      return interaction.reply({ content: "That’s… not how this works 😅", ephemeral: true });

    try {
      const res = await axios.get("https://nekos.best/api/v2/kiss");
      const gif = res.data.results[0].url;

      const embed = new EmbedBuilder()
        .setDescription(`**${interaction.user.username}** kisses **${user.username}** 💕`)
        .setImage(gif)
        .setColor("Pink");

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: "Couldn't fetch a kiss image right now 😔", ephemeral: true });
    }
  },
};
