const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user");
const ShopItem = require("../../models/ShopItem");
const getOrCreateUser = require('../../Functions/getOrCreateUser');

const MIN_BET = 2000;

const CASES = {
  bronze: {
    name: "Bronze Case",
    price: 5_000,
    emoji: "📦",
    pool: [
      { rarity: "common", weight: 60, chipsMin: 1000, chipsMax: 4000 },
      { rarity: "uncommon", weight: 30, chipsMin: 4000, chipsMax: 8000 },
      { rarity: "rare", weight: 10, chipsMin: 8_000, chipsMax: 15_000 }
    ]
  },
  gold: {
    name: "Gold Case",
    price: 20_000,
    emoji: "🧰",
    pool: [
      { rarity: "uncommon", weight: 40, chipsMin: 8_000, chipsMax: 20_000 },
      { rarity: "rare", weight: 35, chipsMin: 20_000, chipsMax: 40_000 },
      { rarity: "epic", weight: 20, chipsMin: 40_000, chipsMax: 80_000 },
      { rarity: "legendary", weight: 5, chipsMin: 80_000, chipsMax: 150_000 }
    ]
  },
  mythic: {
    name: "Mythic Vault",
    price: 100_000,
    emoji: "🗄️",
    pool: [
      { rarity: "rare", weight: 35, chipsMin: 50_000, chipsMax: 100_000 },
      { rarity: "epic", weight: 35, chipsMin: 100_000, chipsMax: 250_000 },
      { rarity: "legendary", weight: 20, chipsMin: 250_000, chipsMax: 500_000 },
      { rarity: "mythic", weight: 10, chipsMin: 500_000, chipsMax: 1_000_000 }
    ]
  }
};

function weightedChoice(pool) {
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of pool) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return pool[pool.length - 1];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cases")
    .setDescription("Open loot cases with random chip rewards.")
    .addStringOption(opt =>
      opt.setName("case")
        .setDescription("Which case to open.")
        .addChoices(
          { name: "Bronze Case (5,000)", value: "bronze" },
          { name: "Gold Case (20,000)", value: "gold" },
          { name: "Mythic Vault (100,000)", value: "mythic" }
        )
        .setRequired(true)
    )
    .setDMPermission(false),

  category: "Economy",

  async execute(interaction) {
    const userId = interaction.user.id;
    const key = interaction.options.getString("case", true);

    const c = CASES[key];
    if (!c) {
      return interaction.reply({ content: "❌ Invalid case.", ephemeral: true });
    }

    let user = await User.findOne({ userId });
    if (!user || user.chips < c.price) {
      return interaction.reply({
        content: `❌ You need \`${c.price.toLocaleString()} chips\` to open this case.`,
        ephemeral: true
      });
    }

    user.chips -= c.price;

    const rewardEntry = weightedChoice(c.pool);
    const rewardChips = Math.floor(
      rewardEntry.chipsMin +
        Math.random() * (rewardEntry.chipsMax - rewardEntry.chipsMin)
    );

    user.chips += rewardChips;
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle(`${c.emoji} ${c.name}`)
      .setColor(
        rewardEntry.rarity === "common"
          ? 0x9ca3af
          : rewardEntry.rarity === "uncommon"
          ? 0x22c55e
          : rewardEntry.rarity === "rare"
          ? 0x3b82f6
          : rewardEntry.rarity === "epic"
          ? 0xa855f7
          : rewardEntry.rarity === "legendary"
          ? 0xf59e0b
          : 0xec4899
      )
      .setDescription(
        `You spent \`${c.price.toLocaleString()} chips\` to open **${c.name}**.\n\n` +
          `Rarity: **${rewardEntry.rarity.toUpperCase()}**\n` +
          `Reward: \`${rewardChips.toLocaleString()} chips\``
      );

    return interaction.reply({ embeds: [embed] });
  }
};
