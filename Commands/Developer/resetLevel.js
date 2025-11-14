// commands/reset_levels.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Level = require("../../Schemas/ServerLevel");
const { DeveloperID } = require("../../config.json"); // 👈 your developer ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_levels")
    .setDescription("Reset all users' levels in this server (Developer Only)."),

  async execute(interaction) {
    if (interaction.user.id !== DeveloperID) {
      return interaction.reply({ content: "❌ Only the developer can use this command.", ephemeral: true });
    }

    const guildId = interaction.guild.id;

    await Level.deleteMany({ guildId });

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("⚠️ Levels Reset")
      .setDescription(`All levels have been reset in **${interaction.guild.name}**.`);

    await interaction.reply({ embeds: [embed] });
  },
};
