const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Send a hug to someone ❤️")
    .addUserOption(option =>
      option.setName("user").setDescription("Who do you want to hug?").setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    if (user.id === interaction.user.id)
      return interaction.reply({ content: "You can’t hug yourself... but here’s a virtual hug 🤗", ephemeral: true });

    try {
      const res = await axios.get("https://nekos.best/api/v2/hug");
      const gif = res.data.results[0].url;

      const embed = new EmbedBuilder()
        .setDescription(`**${interaction.user.username}** hugs **${user.username}** ❤️`)
        .setImage(gif)
        .setColor("Blue");

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: "Couldn't fetch a hug image right now 😔", ephemeral: true });
    }
  },
};
