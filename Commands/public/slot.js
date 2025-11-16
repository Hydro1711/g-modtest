const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const isCasinoCommandAllowed = require('../../Functions/isCasinoCommandAllowed');
const User = require('../../models/user');
const getOrCreateUser = require('../../Functions/getOrCreateUser');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('🎰 Play slots and try your luck!')
    .addIntegerOption(opt =>
      opt.setName('bet').setDescription('Amount of chips to bet').setRequired(true)
    ),

  async execute(interaction) {
    // Casino channel check
    if (!await isCasinoCommandAllowed(interaction)) {
      return interaction.reply({
        content: '<:closeIcon:1395099724473700544> This command can only be used in the designated casino channel.',
        ephemeral: true,
      });
    }

    const bet = interaction.options.getInteger('bet');
    const { user, guild } = interaction;

    if (bet <= 0) {
      return interaction.reply({ content: '<:closeIcon:1395099724473700544> Bet must be more than 0.', ephemeral: true });
    }

    const userData = await getOrCreateUser(user.id);
    if (!userData || userData.chips < bet) {
      return interaction.reply({ content: '<:closeIcon:1395099724473700544> Not enough chips!', ephemeral: true });
    }

    // Slot machine logic
    const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '🔔', '7️⃣'];
    const spin = [];
    for (let i = 0; i < 3; i++) {
      spin.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }

    let winnings = 0;
    if (spin[0] === spin[1] && spin[1] === spin[2]) {
      winnings = bet * 10;
    } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
      winnings = bet * 2;
    }

    if (winnings > 0) {
      userData.chips += winnings;
    } else {
      userData.chips -= bet;
    }
    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle('🎰 Slot Machine')
      .setDescription(spin.join(' | '))
      .addFields({
        name: winnings > 0 ? 'You won!' : 'You lost!',
        value: winnings > 0 ? `🎉 You won **${winnings} chips**!` : `😢 You lost **${bet} chips**.`,
      })
      .setColor(winnings > 0 ? 'Green' : 'Red')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};


