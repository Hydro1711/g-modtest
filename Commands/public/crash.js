const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const User = require("../../models/user");
const getOrCreateUser = require('../../Functions/getOrCreateUser');

const MIN_BET = 100;
const MAX_BET = 1_000_000;

function generateCrashPoint() {
  // Heavily biased towards 1–3x, but with rare big spikes
  const r = Math.random();
  if (r < 0.02) return 20 + Math.random() * 20;   // insane 20–40x
  if (r < 0.10) return 10 + Math.random() * 10;   // 10–20x
  if (r < 0.30) return 3 + Math.random() * 7;     // 3–10x
  // common low crashes
  return 1 + (-Math.log(1 - Math.random()));      // ~1–3x
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crash")
    .setDescription("Play a real-time crash game with multipliers.")
    .addIntegerOption(opt =>
      opt.setName("bet")
        .setDescription("Amount of chips to bet.")
        .setRequired(true)
        .setMinValue(MIN_BET)
    )
    .addNumberOption(opt =>
      opt.setName("auto")
        .setDescription("Auto cashout at this multiplier (example: 2.5).")
        .setRequired(false)
        .setMinValue(1.01)
    )
    .setDMPermission(false),

  category: "Economy",

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet", true);
    const auto = interaction.options.getNumber("auto") || null;

    if (bet < MIN_BET || bet > MAX_BET) {
      return interaction.reply({
        content: `❌ Bet must be between \`${MIN_BET.toLocaleString()}\` and \`${MAX_BET.toLocaleString()}\` chips.`,
        ephemeral: true
      });
    }

    let user = await User.findOne({ userId });
    if (!user || user.chips < bet) {
      return interaction.reply({
        content: `❌ You don't have enough chips for that bet.`,
        ephemeral: true
      });
    }

    // Deduct bet immediately
    user.chips -= bet;
    await user.save();

    const crashPoint = generateCrashPoint();
    let multiplier = 1.0;
    let crashed = false;
    let cashedOut = false;
    let ended = false;

    const embed = new EmbedBuilder()
      .setTitle("💥 Crash Game")
      .setColor(0x38bdf8)
      .setDescription(
        `Bet: \`${bet.toLocaleString()} chips\`\n` +
        (auto ? `Auto cashout at: **${auto.toFixed(2)}x**\n` : "") +
        `\nMultiplier: **${multiplier.toFixed(2)}x**\n` +
        `Status: 🟢 Rising...`
      )
      .setFooter({ text: "Press Cash Out before it crashes!" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`crash_cashout_${userId}`)
        .setLabel("💸 Cash Out")
        .setStyle(ButtonStyle.Success)
    );

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return btnInteraction.reply({
          content: "❌ You are not part of this game.",
          ephemeral: true
        });
      }

      if (cashedOut || crashed) {
        return btnInteraction.reply({
          content: "⚠️ The game has already ended.",
          ephemeral: true
        });
      }

      cashedOut = true;
      ended = true;

      const win = Math.floor(bet * multiplier);
      user.chips += win;
      await user.save();

      const resultEmbed = EmbedBuilder.from(embed)
        .setColor(0x22c55e)
        .setDescription(
          `Bet: \`${bet.toLocaleString()} chips\`\n` +
          `Multiplier: **${multiplier.toFixed(2)}x**\n` +
          `Status: ✅ You cashed out and won \`${win.toLocaleString()} chips\`!`
        );

      await btnInteraction.update({
        embeds: [resultEmbed],
        components: []
      });
    });

    collector.on("end", async () => {
      // If for some reason timer ends but loop didn't, the loop check below will handle.
      // We don't edit here to avoid clashing with the main flow.
      return;
    });

    // Main crash loop
    const tickMs = 900;
    while (!ended) {
      await new Promise((res) => setTimeout(res, tickMs));

      // increase multiplier faster at high values
      const growth = multiplier < 2 ? 0.07 : multiplier < 5 ? 0.10 : 0.15;
      multiplier *= 1 + growth;

      // Auto cashout
      if (!cashedOut && auto && multiplier >= auto && !crashed) {
        cashedOut = true;
        ended = true;

        const win = Math.floor(bet * multiplier);
        user.chips += win;
        await user.save();

        const resultEmbed = EmbedBuilder.from(embed)
          .setColor(0x22c55e)
          .setDescription(
            `Bet: \`${bet.toLocaleString()} chips\`\n` +
            `Auto Cashout: **${auto.toFixed(2)}x**\n` +
            `Final Multiplier: **${multiplier.toFixed(2)}x**\n` +
            `Status: ✅ Auto-cashed out and you won \`${win.toLocaleString()} chips\`!`
          );

        await message.edit({ embeds: [resultEmbed], components: [] }).catch(() => {});
        break;
      }

      if (multiplier >= crashPoint && !cashedOut) {
        crashed = true;
        ended = true;

        const crashEmbed = EmbedBuilder.from(embed)
          .setColor(0xef4444)
          .setDescription(
            `Bet: \`${bet.toLocaleString()} chips\`\n` +
            `Crashed at: **${crashPoint.toFixed(2)}x**\n` +
            `Status: 💥 You lost your bet.`
          );

        await message.edit({ embeds: [crashEmbed], components: [] }).catch(() => {});
        break;
      }

      // Update live
      if (!crashed && !cashedOut) {
        const liveEmbed = EmbedBuilder.from(embed)
          .setDescription(
            `Bet: \`${bet.toLocaleString()} chips\`\n` +
            (auto ? `Auto cashout at: **${auto.toFixed(2)}x**\n` : "") +
            `\nMultiplier: **${multiplier.toFixed(2)}x**\n` +
            `Status: 🟢 Rising...`
          );

        await message.edit({ embeds: [liveEmbed] }).catch(() => {});
      }
    }
  }
};
