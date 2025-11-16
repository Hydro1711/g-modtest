const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const User = require('../../models/user');
const isCasinoCommandAllowed = require('../../Functions/isCasinoCommandAllowed');
const getOrCreateUser = require('../../Functions/getOrCreateUser');

const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

const DOZEN1 = Array.from({ length: 12 }, (_, i) => i + 1);    // 1–12
const DOZEN2 = Array.from({ length: 12 }, (_, i) => i + 13);   // 13–24
const DOZEN3 = Array.from({ length: 12 }, (_, i) => i + 25);   // 25–36

const K1 = [1,4,7,10,13,16,19,22,25,28,31,34];  // 1st column
const K2 = [2,5,8,11,14,17,20,23,26,29,32,35];  // 2nd column
const K3 = [3,6,9,12,15,18,21,24,27,30,33,36];  // 3rd column

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Play roulette: bet on red, black, a number, a dozen, or a column.')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Bet on: red, black, 0-36, dozen1, dozen2, dozen3, k1, k2, k3, even, odd')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check casino channel permission
    if (!(await isCasinoCommandAllowed(interaction))) {
      return interaction.reply({
        content: '<:closeIcon:1395099724473700544> This command can only be used in the designated casino channel.',
        ephemeral: true,
      });
    }

    const bet = interaction.options.getInteger('bet');
    const rawChoice = interaction.options.getString('choice').toLowerCase();
    const { user, guild } = interaction;

    if (bet <= 0) {
      return interaction.reply({ content: '<:closeIcon:1395099724473700544> Bet must be more than 0.', ephemeral: true });
    }

    const userData = await User.findOne({ userId: user.id, guildId: guild.id });
    if (!userData || userData.chips < bet) {
      return interaction.reply({ content: '<:closeIcon:1395099724473700544> Not enough chips.', ephemeral: true });
    }

    const result = Math.floor(Math.random() * 37); // 0–36
    let winnings = 0;
    let win = false;

    const numericChoice = parseInt(rawChoice);

    if (rawChoice === 'red' && RED.includes(result)) {
      winnings = bet * 2;
      win = true;
    } else if (rawChoice === 'black' && BLACK.includes(result)) {
      winnings = bet * 2;
      win = true;
    } else if (!isNaN(numericChoice) && numericChoice === result) {
      winnings = bet * 36;
      win = true;
    } else if (rawChoice === 'dozen1' && DOZEN1.includes(result)) {
      winnings = bet * 3;
      win = true;
    } else if (rawChoice === 'dozen2' && DOZEN2.includes(result)) {
      winnings = bet * 3;
      win = true;
    } else if (rawChoice === 'dozen3' && DOZEN3.includes(result)) {
      winnings = bet * 3;
      win = true;
    } else if (rawChoice === 'k1' && K1.includes(result)) {
      winnings = bet * 3;
      win = true;
    } else if (rawChoice === 'k2' && K2.includes(result)) {
      winnings = bet * 3;
      win = true;
    } else if (rawChoice === 'k3' && K3.includes(result)) {
      winnings = bet * 3;
      win = true;
    } else if (rawChoice === 'even' && result !== 0 && result % 2 === 0) {
      winnings = bet * 2;
      win = true;
    } else if (rawChoice === 'odd' && result % 2 === 1) {
      winnings = bet * 2;
      win = true;
    } else {
      winnings = -bet;
    }

    userData.chips += winnings;
    await userData.save();

    const imagePath = path.join(__dirname, '..', '..', 'assets', 'roulette_images', `${result}.png`);
    const image = new AttachmentBuilder(imagePath);

    const embed = new EmbedBuilder()
      .setTitle('🎡 Roulette')
      .setDescription(
        `The ball landed on **${result}**.\n\n` +
        (win
          ? `🎉 You won **${winnings} chips**!`
          : `😢 You lost **${bet} chips**.`)
      )
      .setColor(win ? 'Green' : 'Red')
      .setImage(`attachment://${result}.png`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], files: [image] });
  }
};

