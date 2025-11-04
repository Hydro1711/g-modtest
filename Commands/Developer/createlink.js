const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createlink')
    .setDescription('🔗 Creates an invite link for a server the bot is in.')
    .addStringOption(option =>
      option
        .setName('serverid')
        .setDescription('The ID of the server to create an invite link for')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Allow both DeveloperID and TesterID
    if (![config.DeveloperID, config.TesterID].includes(interaction.user.id)) {
      return interaction.reply({
        content: '❌ You are not authorized to use this command.',
        ephemeral: true
      });
    }

    const serverId = interaction.options.getString('serverid');

    let guild = interaction.client.guilds.cache.get(serverId);
    if (!guild) {
      return interaction.reply({
        content: `❌ The bot is not in a server with ID \`${serverId}\`.`,
        ephemeral: true
      });
    }

    // Find a channel where the bot can create an invite
    const channel = guild.channels.cache.find(ch =>
      ch.isTextBased() &&
      ch.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)
    );

    if (!channel) {
      return interaction.reply({
        content: '❌ No channel found where the bot can create an invite link.',
        ephemeral: true
      });
    }

    try {
      const invite = await channel.createInvite({ maxAge: 0, maxUses: 0, unique: true });
      return interaction.reply({
        content: `🔗 Here is the invite link for **${guild.name}**:\n${invite.url}`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error creating invite:', error);
      return interaction.reply({
        content: '❌ Failed to create an invite link.',
        ephemeral: true
      });
    }
  },
};
