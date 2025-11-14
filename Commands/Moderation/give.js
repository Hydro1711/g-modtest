const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/user');
const { DeveloperID } = require('../../config.json'); // fixed typo

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Give chips to a user (Bot owner only).')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('User to give chips')
        .setRequired(true)
    )
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Amount of chips')
        .setRequired(true)
    ),

  async execute(interaction) {
    const invokingUserId = interaction.user.id;

    // Owner check
    if (invokingUserId !== DeveloperID) {
      console.log(`[Permission Denied] ${interaction.user.tag} (ID: ${invokingUserId}) tried to use /give.`);
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    // Validate amount
    if (amount <= 0) {
      console.log(`[Invalid Amount] ${interaction.user.tag} tried to give invalid amount: ${amount}`);
      return interaction.reply({
        content: '❌ Amount must be greater than 0.',
        ephemeral: true,
      });
    }

    // Get or create user data
    let userData = await User.findOne({ userId: target.id, guildId });
    if (!userData) {
      console.log(`[User Not Found] Creating user data for ${target.tag}.`);
      userData = await User.create({ userId: target.id, guildId, chips: 0 });
    }

    // Add chips
    userData.chips += amount;
    await userData.save();

    console.log(`[Chips Given] ${interaction.user.tag} gave ${amount} chips to ${target.tag}. New balance: ${userData.chips}`);

    const embed = new EmbedBuilder()
      .setTitle('<:chipsIcon:1395105117237284985> Chips Given')
      .setDescription(`You gave **${amount} chips** to ${target}.`)
      .setColor('DarkGreen')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
