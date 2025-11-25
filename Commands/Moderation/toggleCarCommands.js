const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const CarCommandSetting = require("../../Schemas/carCommandSetting");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toggle-car-commands")
    .setDescription("Toggle BMW commands for this server"),

  async execute(interaction) {
    // Permission check
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({
        content: "❌ You need the **Manage Messages** permission to use this command.",
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;

    try {
      // Fetch existing setting
      let config = await CarCommandSetting.findOne({ guildId });

      if (!config) {
        // Create new setting and enable by default
        config = await CarCommandSetting.create({ guildId, enabled: true });
        const embed = new EmbedBuilder()
          .setDescription("✅ BMW commands are now **enabled** on this server.")
          .setColor("Green");
        return interaction.reply({ embeds: [embed] }); // not ephemeral
      }

      // Toggle enabled state
      config.enabled = !config.enabled;
      await config.save();

      const embed = new EmbedBuilder()
        .setDescription(config.enabled
          ? "✅ BMW commands are now **enabled** on this server."
          : "❌ BMW commands are now **disabled** on this server.")
        .setColor(config.enabled ? "Green" : "Red");

      await interaction.reply({ embeds: [embed] }); // not ephemeral
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Something went wrong while toggling BMW commands.",
        ephemeral: true
      });
    }
  }
};
