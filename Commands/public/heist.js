const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");

const HEIST_COOLDOWN = 30 * 60 * 1000; // 30 minutes
const JAIL_TIME = 45 * 60 * 1000;      // 45 minutes
const MIN_CHIPS_REQUIRED = 500;        // must have at least this to attempt

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes && seconds) parts.push(`${seconds}s`);
  return parts.join(" ") || "a moment";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("heist")
    .setDescription("Attempt a high-risk heist for big chips (global, with jail)."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({ userId, chips: 0 });
      }

      // Check jail
      if (user.jailUntil && user.jailUntil.getTime() > now) {
        const remaining = user.jailUntil.getTime() - now;
        return interaction.reply({
          content: `🚔 You are still in prison. You can’t do a heist for **${formatDuration(remaining)}**.`,
          ephemeral: true,
        });
      }

      // Check cooldown
      if (user.lastHeist) {
        const diff = now - user.lastHeist.getTime();
        if (diff < HEIST_COOLDOWN) {
          const remaining = HEIST_COOLDOWN - diff;
          return interaction.reply({
            content: `⏳ You recently attempted a heist. Try again in **${formatDuration(remaining)}**.`,
            ephemeral: true,
          });
        }
      }

      if ((user.chips || 0) < MIN_CHIPS_REQUIRED) {
        return interaction.reply({
          content: `💸 You need at least **${MIN_CHIPS_REQUIRED} chips** to fund a heist.`,
          ephemeral: true,
        });
      }

      user.lastHeist = new Date(now);

      const roll = Math.random(); // 0–1

      // Success ~35%
      if (roll < 0.35) {
        const reward = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000; // 3k–10k
        user.chips = (user.chips || 0) + reward;
        user.jailUntil = null;
        await user.save();

        const embed = new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("💰 Heist Successful!")
          .setDescription(
            [
              "You and your crew pulled off a **successful heist**.",
              `You escaped with **${reward.toLocaleString()} chips**.`,
            ].join("\n")
          )
          .addFields({ name: "Total Chips", value: `${user.chips.toLocaleString()}`, inline: true })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // Partial fail ~35% – lose some chips
      if (roll < 0.7) {
        const loss = Math.floor((user.chips || 0) * (Math.random() * 0.25 + 0.1)); // lose 10–35%
        user.chips = Math.max(0, (user.chips || 0) - loss);
        user.jailUntil = null;
        await user.save();

        const embed = new EmbedBuilder()
          .setColor(Colors.Orange)
          .setTitle("⚠️ Heist Went Wrong")
          .setDescription(
            [
              "The heist got messy. You dropped part of the loot while escaping.",
              `You lost **${loss.toLocaleString()} chips**.`,
            ].join("\n")
          )
          .addFields({ name: "Total Chips", value: `${user.chips.toLocaleString()}`, inline: true })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      // Total fail ~30% – jail + big loss
      const loss = Math.floor((user.chips || 0) * (Math.random() * 0.5 + 0.25)); // lose 25–75%
      user.chips = Math.max(0, (user.chips || 0) - loss);
      user.jailUntil = new Date(now + JAIL_TIME);
      await user.save();

      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle("🚔 Heist Failed – You Got Caught")
        .setDescription(
          [
            "The cops surrounded you mid-heist.",
            `You lost **${loss.toLocaleString()} chips** and you’re now in **prison** for **${formatDuration(JAIL_TIME)}**.`,
          ].join("\n")
        )
        .addFields({ name: "Total Chips", value: `${user.chips.toLocaleString()}`, inline: true })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /heist:", err);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ content: "❌ Error while processing heist." });
      }
      await interaction.reply({
        content: "❌ Error while processing heist.",
        ephemeral: true,
      });
    }
  },
};
