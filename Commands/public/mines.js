const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require('discord.js');
const User = require('../../models/user');
const isCasinoCommandAllowed = require('../../Functions/isCasinoCommandAllowed');

function generateMinesGrid(bombCount = 5) {
  const grid = Array(25).fill('safe');
  let bombsPlaced = 0;

  while (bombsPlaced < bombCount) {
    const index = Math.floor(Math.random() * 25);
    if (grid[index] === 'safe') {
      grid[index] = 'bomb';
      bombsPlaced++;
    }
  }

  return grid;
}

function createGridComponents(revealed = [], grid = [], includeCashout = false) {
  const components = [];

  for (let row = 0; row < 5; row++) {
    const actionRow = new ActionRowBuilder();

    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      const isRevealed = revealed.includes(index);

      let button;

      if (includeCashout && index === 24) {
        button = new ButtonBuilder()
          .setCustomId('cashout')
          .setLabel('💰')
          .setStyle(ButtonStyle.Success);
      } else {
        button = new ButtonBuilder()
          .setCustomId(`mines_${index}`)
          .setLabel(isRevealed ? (grid[index] === 'bomb' ? '💣' : '✅') : '⬜')
          .setStyle(
            isRevealed
              ? grid[index] === 'bomb'
                ? ButtonStyle.Danger
                : ButtonStyle.Success
              : ButtonStyle.Secondary
          )
          .setDisabled(isRevealed);
      }

      actionRow.addComponents(button);
    }

    components.push(actionRow);
  }

  return components;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('🪜 Play Mines: avoid the bombs and get rich!')
    .addIntegerOption((opt) =>
      opt.setName('bet').setDescription('Amount to bet').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('bombs')
        .setDescription('Number of bombs (3-15)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!(await isCasinoCommandAllowed(interaction))) {
      return interaction.reply({
        content: '❌ This command can only be used in the designated casino channel.',
        ephemeral: true,
      });
    }

    const bet = interaction.options.getInteger('bet');
    const bombCount = interaction.options.getInteger('bombs') || 5;
    const { user, guild } = interaction;

    if (bet <= 0 || bombCount < 3 || bombCount > 15) {
      return interaction.reply({
        content: '❌ Invalid bet or bomb count (3–15 bombs allowed).',
        ephemeral: true,
      });
    }

    const userData = await User.findOne({ userId: user.id, guildId: guild.id });
    if (!userData || userData.chips < bet) {
      return interaction.reply({
        content: '❌ Not enough chips.',
        ephemeral: true,
      });
    }

    const grid = generateMinesGrid(bombCount);
    const revealed = [];
    let multiplier = 1.0;
    let gameEnded = false;

    const embed = new EmbedBuilder()
      .setTitle('🪜 Mines')
      .setDescription(
        `Avoid the bombs and increase your multiplier!\nBombs: **${bombCount}**, Bet: **${bet} chips**`
      )
      .setColor(0xffc107)
      .setTimestamp();

    const message = await interaction.reply({
      embeds: [embed],
      components: createGridComponents(revealed, grid, true),
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({
          content: '❌ This is not your game!',
          ephemeral: true,
        });
      }

      if (gameEnded) return;

      if (i.customId === 'cashout') {
        const winnings = Math.floor(bet * multiplier);
        userData.chips += winnings - bet;
        await userData.save();

        embed
          .setDescription(`💰 You cashed out and won **${winnings} chips**! (x${multiplier.toFixed(1)})`)
          .setColor('Green');
        gameEnded = true;
        collector.stop('cashed');

        return i.update({
          embeds: [embed],
          components: createGridComponents(revealed, grid, false),
        });
      }

      const index = parseInt(i.customId.split('_')[1]);
      if (revealed.includes(index)) return;

      revealed.push(index);

      if (grid[index] === 'bomb') {
        userData.chips -= bet;
        await userData.save();

        embed
          .setDescription(`💥 You hit a bomb and lost **${bet} chips**.`)
          .setColor('Red');
        gameEnded = true;
        collector.stop('bomb');

        return i.update({
          embeds: [embed],
          components: createGridComponents(revealed, grid, false),
        });
      }

      multiplier += 0.2;

      embed.setDescription(
        `✅ You revealed a safe tile!\nMultiplier: **x${multiplier.toFixed(
          1
        )}**\nClick more tiles or press **💰** to cash out.`
      );

      await i.update({
        embeds: [embed],
        components: createGridComponents(revealed, grid, true),
      });
    });

    collector.on('end', async (_, reason) => {
      if (!gameEnded && reason !== 'cashed' && reason !== 'bomb') {
        const winnings = Math.floor(bet * multiplier);
        userData.chips += winnings - bet;
        await userData.save();

        embed
          .setDescription(
            `⏹️ Time's up. You auto-cashed with **${winnings} chips** (x${multiplier.toFixed(1)}).`
          )
          .setColor('Yellow');

        await interaction.editReply({
          embeds: [embed],
          components: createGridComponents(revealed, grid, false),
        });
      }
    });
  },
};
