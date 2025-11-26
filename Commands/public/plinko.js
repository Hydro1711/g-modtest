const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const User = require("../../models/user");

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// Balanced boards (averages under 1.0)
const BOARDS = {
  low:  [0.3, 0.5, 0.8, 1, 1.1, 1.3],          // avg ~0.93
  med:  [0.1, 0.3, 0.7, 1, 1.4, 2],            // avg ~0.92
  high: [0, 0.1, 0.5, 1.3, 2.5, 4.5]           // avg ~0.87
};

// Weighted slot odds (middle more likely)
const WEIGHTS = [1, 2, 3, 2, 1, 0.5];

// Per-risk bet limits
const BET_LIMITS = {
  low:  { min: 50,  max: 250_000 },
  med:  { min: 100, max: 100_000 },
  high: { min: 250, max: 50_000 }
};

// Weighted random slot picker
function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  return weights.findIndex(w => (r -= w) < 0);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("plinko")
    .setDescription("Drop a chip on a Plinko board with risk-based multipliers.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of chips to bet.")
        .setRequired(true)
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

    const limits = BET_LIMITS[risk];
    const board = BOARDS[risk];

    // Validate bet range for the selected risk tier
    if (bet < limits.min || bet > limits.max) {
      return interaction.reply({
        content: `❌ For **${risk} risk**, your bet must be between \`${limits.min.toLocaleString()}\` and \`${limits.max.toLocaleString()}\` chips.`,
        ephemeral: true
      });
    }

    // Fetch or create user
    let user = await User.findOne({ userId });
    if (!user) {
      return interaction.reply({
        content: "❌ You must have an account before gambling.",
        ephemeral: true
      });
    }

    // Check cooldown
    if (user.cooldowns?.plinko && Date.now() - user.cooldowns.plinko < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (Date.now() - user.cooldowns.plinko);
      const seconds = Math.ceil(remaining / 1000);

      return interaction.reply({
        content: `⏳ You must wait **${seconds}s** before playing Plinko again.`,
        ephemeral: true
      });
    }

    // Check balance
    if (user.chips < bet) {
      return interaction.reply({
        content: "❌ Not enough chips.",
        ephemeral: true
      });
    }

    // Apply bet
    user.chips -= bet;

    // Weighted slot selection
    const slotIndex = weightedIndex(WEIGHTS);
    const multiplier = board[slotIndex];
    const win = Math.floor(bet * multiplier);

    // Apply winnings
    if (win > 0) user.chips += win;

    // Apply cooldown
    if (!user.cooldowns) user.cooldowns = {};
    user.cooldowns.plinko = Date.now();

    await user.save();

    const riskLabel =
      risk === "low" ? "Low Risk" :
      risk === "med" ? "Medium Risk" :
      "High Risk";

    const embed = new EmbedBuilder()
      .setTitle("🟢 Plinko")
      .setColor(win >= bet ? 0x22c55e : 0xf97316)
      .setDescription(
        `🎯 **${riskLabel} Board**\n` +
        `💰 Bet: \`${bet.toLocaleString()}\`\n` +
        `📍 Slot: **${slotIndex + 1}/${board.length}**\n` +
        `📈 Multiplier: **x${multiplier.toFixed(2)}**\n\n` +
        (win > 0
          ? `🎉 You won \`${win.toLocaleString()}\` chips!`
          : `💀 You lost your bet.`)
      );

    return interaction.reply({ embeds: [embed] });
  }
};
