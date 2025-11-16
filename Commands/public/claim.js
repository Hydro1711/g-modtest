const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/user');
const isCasinoCommandAllowed = require('../../Functions/isCasinoCommandAllowed');
const getOrCreateUser = require('../../Functions/getOrCreateUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim your daily chips (every 24h).'),

  async execute(interaction) {
    // Check casino channel
    if (!await isCasinoCommandAllowed(interaction)) {
      return interaction.reply({
        content: '<:closeIcon:1395099724473700544> This command can only be used in the designated casino channel.',
        ephemeral: true,
      });
    }

    const { user, member } = interaction;
    const userId = user.id;

    // ✅ FIXED: GLOBAL USER (NO guildId)
    let userData = await User.findOne({ userId });
    if (!userData) {
      userData = await User.create({
        userId,
        chips: 0,
        inventory: [],
        activeBoosts: [],
        permanentUpgrades: []
      });
    }

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (userData.lastClaim && now - userData.lastClaim < cooldown) {
      const remaining = cooldown - (now - userData.lastClaim);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('<:hourglassIcon:1395101523264016454> Claim Cooldown')
        .setDescription(`You can claim again in **${hours}h ${minutes}m**.`)
        .setColor('Red')
        .setTimestamp();

      return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
    }

    // Booster bonus
    const isBooster = member.premiumSince != null;
    const baseReward = 1000;
    const reward = isBooster ? baseReward * 1.5 : baseReward;

    // Add chips
    userData.chips += reward;
    userData.lastClaim = now;
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('💰 Daily Claim')
      .setDescription(`You claimed **${reward.toLocaleString()} chips**!${isBooster ? ' (Boost bonus 🧪)' : ''}`)
      .setColor('Green')
      .setFooter({ text: `${user.username} • Casino Bot`, iconURL: user.displayAvatarURL() })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};

