const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const User = require("../../models/user");

const MIN_BET = 100;
const MAX_BET = 500_000;
const FLOORS = 7;
const TILES_PER_FLOOR = 3;

function genBombPosition() {
  return Math.floor(Math.random() * TILES_PER_FLOOR); // 0,1,2
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tower")
    .setDescription("Climb a risky tower. Pick safe tiles, or lose everything.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of chips to bet.")
        .setRequired(true)
        .setMinValue(MIN_BET)
    )
    .setDMPermission(false),

  category: "Economy",

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet", true);

    if (bet < MIN_BET || bet > MAX_BET) {
      return interaction.reply({
        content: `❌ Bet must be between \`${MIN_BET.toLocaleString()}\` and \`${MAX_BET.toLocaleString()}\` chips.`,
        ephemeral: true
      });
    }

    let user = await User.findOne({ userId });
    if (!user || user.chips < bet) {
      return interaction.reply({ content: "❌ Not enough chips.", ephemeral: true });
    }

    user.chips -= bet;
    await user.save();

    let floor = 0;
    let multiplier = 1.0;
    let active = true;

    const bombs = Array.from({ length: FLOORS }, () => genBombPosition());

    const buildButtons = () => {
      const row = new ActionRowBuilder();
      for (let i = 0; i < TILES_PER_FLOOR; i++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`tower_${userId}_${floor}_${i}`)
            .setLabel(`Tile ${i + 1}`)
            .setStyle(ButtonStyle.Secondary)
        );
      }
      const cashRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tower_cashout_${userId}`)
          .setLabel("💸 Cash Out")
          .setStyle(ButtonStyle.Success)
      );
      return [row, cashRow];
    };

    const calcMult = (f) => {
      // higher floors give much better multipliers
      return 1 + f * 0.35;
    };

    const embed = new EmbedBuilder()
      .setTitle("🗼 Tower Game")
      .setColor(0x3b82f6)
      .setDescription(
        `Bet: \`${bet.toLocaleString()} chips\`\n` +
        `Floors: **${FLOORS}**, Tiles each: **${TILES_PER_FLOOR}**\n\n` +
        `Floor: **0/${FLOORS}**\n` +
        `Multiplier: **${multiplier.toFixed(2)}x**\n` +
        `Status: Pick a tile.`
      );

    const message = await interaction.reply({
      embeds: [embed],
      components: buildButtons(),
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90_000
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== userId) {
        return btn.reply({ content: "❌ This is not your tower.", ephemeral: true });
      }
      if (!active) {
        return btn.reply({ content: "⚠️ This game has ended.", ephemeral: true });
      }

      if (btn.customId === `tower_cashout_${userId}`) {
        active = false;
        const win = Math.floor(bet * multiplier);
        user.chips += win;
        await user.save();

        const resultEmbed = EmbedBuilder.from(embed)
          .setColor(0x22c55e)
          .setDescription(
            `Bet: \`${bet.toLocaleString()} chips\`\n` +
            `Final Floor: **${floor}/${FLOORS}**\n` +
            `Multiplier: **${multiplier.toFixed(2)}x**\n` +
            `Status: ✅ You cashed out and won \`${win.toLocaleString()} chips\`.`
          );

        return btn.update({ embeds: [resultEmbed], components: [] });
      }

      const [, , floorStr, tileStr] = btn.customId.split("_");
      const tile = parseInt(tileStr, 10);

      const bombPos = bombs[floor];
      const isBomb = tile === bombPos;

      if (isBomb) {
        active = false;

        const loseEmbed = EmbedBuilder.from(embed)
          .setColor(0xef4444)
          .setDescription(
            `Bet: \`${bet.toLocaleString()} chips\`\n` +
            `You hit a 💣 on floor **${floor + 1}**!\n` +
            `Status: 💥 You lost your bet.`
          );

        return btn.update({ embeds: [loseEmbed], components: [] });
      }

      floor += 1;
      multiplier = calcMult(floor);

      if (floor >= FLOORS) {
        active = false;
        const win = Math.floor(bet * multiplier);
        user.chips += win;
        await user.save();

        const topEmbed = EmbedBuilder.from(embed)
          .setColor(0x22c55e)
          .setDescription(
            `Bet: \`${bet.toLocaleString()} chips\`\n` +
            `You cleared all **${FLOORS}** floors!\n` +
            `Multiplier: **${multiplier.toFixed(2)}x**\n` +
            `Status: 🏆 You win \`${win.toLocaleString()} chips\`.`
          );

        return btn.update({ embeds: [topEmbed], components: [] });
      }

      const updEmbed = EmbedBuilder.from(embed)
        .setDescription(
          `Bet: \`${bet.toLocaleString()} chips\`\n` +
          `Floors: **${FLOORS}**, Tiles each: **${TILES_PER_FLOOR}**\n\n` +
          `Floor: **${floor}/${FLOORS}**\n` +
          `Multiplier: **${multiplier.toFixed(2)}x**\n` +
          `Status: ✅ Safe! Pick another tile or cash out.`
        );

      return btn.update({ embeds: [updEmbed], components: buildButtons() });
    });

    collector.on("end", async () => {
      if (active) {
        active = false;
        // No auto-refund here, the bet is lost on timeout.
        await message.edit({ components: [] }).catch(() => {});
      }
    });
  }
};
