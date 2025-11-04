const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const GuildSettings = require("../../Schemas/GuildSettings.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("togglelevels")
    .setDescription("Enable or disable the XP/level system in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption(option =>
      option.setName("enabled")
        .setDescription("Enable = true, Disable = false")
        .setRequired(true)
    ),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean("enabled");
    const guildId = interaction.guild.id;

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { levelsEnabled: enabled },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .setDescription(
        enabled
          ? "✅ Level system enabled for this server!"
          : "🚫 Level system disabled for this server!"
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
