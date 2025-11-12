const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("smoke")
    .setDescription("Light up a cigarette or join someone for a smoke.")
    .addUserOption(option =>
      option.setName("user").setDescription("User to smoke with").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const res = await fetch("https://nekos.best/api/v2/smug");
    const data = await res.json();
    const gif = data.results[0].url;

    const embed = new EmbedBuilder()
      .setColor("DarkGrey")
      .setImage(gif)
      .setDescription(
        user
          ? `💨 ${interaction.user} lights a cigarette with ${user}.`
          : `💨 ${interaction.user} lights up a cigarette.`
      )
      .setFooter({ text: "Stay calm, take a puff." });

    await interaction.reply({ embeds: [embed] });
  },
};
