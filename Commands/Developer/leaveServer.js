const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaveserver')
    .setDescription('🚪 Makes the bot leave a server by ID.')
    .addStringOption(option =>
      option
        .setName('serverid')
        .setDescription('The ID of the server to leave')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (interaction.user.id !== config.DeveloperID) {
      return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
    }

    const serverId = interaction.options.getString('serverid');
    const guild = interaction.client.guilds.cache.get(serverId);

    if (!guild) {
      return interaction.reply({ content: `❌ The bot is not in a server with ID \`${serverId}\`.`, ephemeral: true });
    }

    try {
      await guild.leave();
      return interaction.reply({ content: `✅ Successfully left the server **${guild.name}** (\`${guild.id}\`).`, ephemeral: true });
    } catch (error) {
      console.error('Error leaving server:', error);
      return interaction.reply({ content: '❌ Failed to leave the server.', ephemeral: true });
    }
  },
};
