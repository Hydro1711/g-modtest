const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const ModLogs = require("../../Schemas/modLogs"); // adjust path as needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_modlogs")
    .setDescription("Set the channel for moderation logs.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("The channel where mod logs will be sent.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    await ModLogs.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { channelId: channel.id },
      { upsert: true }
    );

    return interaction.reply({
      content: `<:Online:1424912330621321256> Moderation logs channel set to ${channel}`,
      ephemeral: true
    });
  }
};
