const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Sends a user's avatar in full resolution.")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Select a user.")
        .setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const avatar = user.displayAvatarURL({ size: 1024, dynamic: true });

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(avatar)
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  },
};
