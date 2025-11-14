const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/user');
const isCasinoCommandAllowed = require('../../Functions/isCasinoCommandAllowed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim your daily chips (every 24h).'),
  async execute(interaction) {
    if (!await isCasinoCommandAllowed(interaction)) {
      return interaction.reply({
        content: '<:closeIcon:1395099724473700544> This command can only be used in the designated casino channel.',
        ephemeral: true,
      });
    }

    const { user, guild, member } = interaction;
    const now = Date.now();
    let userData = await User.findOne({ userId: user.id, guildId: guild.id });
    if (!userData) userData = await User.create({ userId: user.id, guildId: guild.id });

    const cooldown = 24 * 60 * 60 * 1000;
    const timePassed = now - userData.lastClaim;

    if (timePassed < cooldown) {
      const timeLeft = cooldown - timePassed;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('<:hourglassIcon:1395101523264016454> Claim Cooldown')
        .setDescription(`You can claim again in **${hours}h ${minutes}m**.`)
        .setColor('Red')
        .setTimestamp();

      return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
    }

    const isBooster = member.premiumSince;
    const reward = isBooster ? 1500 : 1000;

    userData.chips += reward;
    userData.lastClaim = now;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('💰 Daily Claim')
      .setDescription(`You claimed **${reward} chips**!${isBooster ? ' (Boost bonus 🧪)' : ''}`)
      .setColor('Green')
      .setFooter({ text: `${user.username} • Casino Bot`, iconURL: user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
