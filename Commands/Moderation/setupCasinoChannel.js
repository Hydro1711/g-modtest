const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const CasinoConfig = require('../../models/CasinoConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup_casino_channel')
    .setDescription('Set the channel for casino commands.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel where casino commands are allowed')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    if (!channel) {
      console.warn(`[SetupCasinoChannel] ${interaction.user.tag} did not provide a valid channel.`);
      return interaction.reply({ content: '<:closekIcon:1395099724473700544> Please provide a valid channel.', ephemeral: true });
    }

    console.log(`[SetupCasinoChannel] ${interaction.user.tag} is setting casino channel to ${channel.name} (${channel.id}) in guild ${guildId}`);

    try {
      await CasinoConfig.findOneAndUpdate(
        { guildId },
        { casinoChannelId: channel.id.toString(), enabled: true },
        { upsert: true, new: true }
      );

      console.log(`[SetupCasinoChannel] Successfully set casino channel to ${channel.name} (${channel.id}) in guild ${guildId}`);

      return interaction.reply({
        content: `<:checkIcon:1395099367333167307> Casino commands are now restricted to ${channel}.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(`[SetupCasinoChannel] Error setting casino channel for guild ${guildId}:`, error);
      return interaction.reply({
        content: `<:closekIcon:1395099724473700544> Error setting casino channel: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
