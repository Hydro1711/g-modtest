// commands/resetChips.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user"); // adjust path if needed
const { DeveloperID } = require("../../config.json"); // 👈 your developer ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resetallchips")
    .setDescription("Reset all users' chips globally (Developer Only)."),

  async execute(interaction) {
    if (interaction.user.id !== DeveloperID) {
      return interaction.reply({ content: "❌ Only the developer can use this command.", ephemeral: true });
    }

    try {
      const result = await User.updateMany({}, { $set: { chips: 0 } });

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("⚠️ Chips Reset")
        .setDescription(`All users' chips have been reset globally.\n**Users affected:** ${result.modifiedCount}`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error resetting chips:", error);
      await interaction.reply({ content: "❌ There was an error resetting all chips.", ephemeral: true });
    }
  },
};
