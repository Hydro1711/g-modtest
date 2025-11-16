const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const User = require("../../models/user");

const MIN_BET = 50;
const MAX_BET = 250_000;

const BOARDS = {
  low:  [0.5, 0.8, 1, 1.2, 1.5, 2],
  med:  [0.3, 0.7, 1, 1.5, 2.2, 3.5],
  high: [0.2, 0.5, 1, 2.5, 5, 10]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plinko")
    .setDescription("Drop a chip on a Plinko board with risk-based multipliers.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of chips to bet.")
        .setRequired(true)
        .setMinValue(MIN_BET)
    )
    .addStringOption(opt =>
      opt.setName("risk")
        .setDescription("Risk level of the board.")
        .addChoices(
          { name: "Low", value: "low" },
          { name: "Medium", value: "med" },
          { name: "High", value: "high" }
        )
        .setRequired(true)
    )
    .setDMPermission(false),

  category: "Economy",

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet", true);
    const risk = interaction.options.getString("risk", true);

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

    const board = BOARDS[risk] || BOARDS.low;
    const slotIndex = Math.floor(Math.random() * board.length);
    const multiplier = board[slotIndex];
    const win = Math.floor(bet * multiplier);

    if (win > 0) user.chips += win;
    await user.save();

    const riskLabel =
      risk === "low" ? "Low Risk"
        : risk === "med" ? "Medium Risk"
          : "High Risk";

    const embed = new EmbedBuilder()
      .setTitle("🟢 Plinko")
      .setColor(win >= bet ? 0x22c55e : 0xf97316)
      .setDescription(
        `Bet: \`${bet.toLocaleString()} chips\`\n` +
        `Board: **${riskLabel}**\n` +
        `Slot: **${slotIndex + 1}/${board.length}**\n` +
        `Multiplier: **x${multiplier.toFixed(2)}**\n\n` +
        (win > 0
          ? `You won \`${win.toLocaleString()} chips\`.`
          : `You lost your bet.`)
      );

    return interaction.reply({ embeds: [embed] });
  }
};
