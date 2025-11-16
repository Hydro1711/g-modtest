const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user");

const MIN_BET = 50;
const MAX_BET = 500_000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Bet on a dice roll with over/under or exact prediction.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of chips to bet.")
        .setRequired(true)
        .setMinValue(MIN_BET)
    )
    .addStringOption(opt =>
      opt.setName("type")
        .setDescription("Prediction type.")
        .addChoices(
          { name: "Over", value: "over" },
          { name: "Under", value: "under" },
          { name: "Exact", value: "exact" }
        )
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("target")
        .setDescription("Target number (2–12 for over/under, 2–12 exact).")
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(12)
    )
    .setDMPermission(false),

  category: "Economy",

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet", true);
    const type = interaction.options.getString("type", true);
    const target = interaction.options.getInteger("target", true);

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

    // Deduct bet
    user.chips -= bet;

    // Roll 2 d6
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;

    let win = 0;
    let resultText = "";

    if (type === "exact") {
      const multiplier = 10; // ~ 1/11 chance
      if (total === target) {
        win = bet * multiplier;
        resultText = `🎯 Exact match! You hit **${total}** (x${multiplier}).`;
      } else {
        resultText = `❌ You needed **${target}** exactly.`;
      }
    } else if (type === "over") {
      const winChance = (12 - target) / 11; // approx
      const multiplier = winChance > 0 ? +(1 / winChance).toFixed(2) : 0;
      if (total > target) {
        win = Math.floor(bet * multiplier);
        resultText = `✅ Dice rolled higher than **${target}**! Multiplier: x${multiplier}.`;
      } else {
        resultText = `❌ Dice did not roll over **${target}**.`;
      }
    } else if (type === "under") {
      const winChance = (target - 2) / 11;
      const multiplier = winChance > 0 ? +(1 / winChance).toFixed(2) : 0;
      if (total < target) {
        win = Math.floor(bet * multiplier);
        resultText = `✅ Dice rolled under **${target}**! Multiplier: x${multiplier}.`;
      } else {
        resultText = `❌ Dice did not roll under **${target}**.`;
      }
    }

    if (win > 0) user.chips += win;
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle("🎲 Dice Game")
      .setColor(win > 0 ? 0x22c55e : 0xef4444)
      .setDescription(
        `Bet: \`${bet.toLocaleString()} chips\`\n` +
        `Prediction: **${type.toUpperCase()} ${target}**\n` +
        `Roll: 🎲 **${d1} + ${d2} = ${total}**\n\n` +
        `${resultText}\n` +
        (win > 0
          ? `You won \`${win.toLocaleString()} chips\`.`
          : `You lost your bet.`)
      );

    return interaction.reply({ embeds: [embed] });
  }
};
