const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push("a few seconds");
  return parts.join(" ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Claim your big weekly chip reward (global)."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({ userId, chips: 0 });
      }

      if (user.lastWeekly) {
        const diff = now - user.lastWeekly.getTime();
        if (diff < WEEK_MS) {
          const remaining = WEEK_MS - diff;
          return interaction.reply({
            content: `⏳ You already claimed your weekly. Try again in **${formatDuration(remaining)}**.`,
            ephemeral: true,
          });
        }
      }

      // Reward range: 2000–5000 chips
      const reward = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;

      user.chips = (user.chips || 0) + reward;
      user.lastWeekly = new Date(now);
      await user.save();

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("📅 Weekly Reward")
        .setDescription(`You claimed your **weekly reward** and received **${reward.toLocaleString()} chips**!`)
        .addFields({ name: "Total Chips", value: `${user.chips.toLocaleString()}`, inline: true })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /weekly:", err);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ content: "❌ Error while claiming weekly reward." });
      }
      await interaction.reply({
        content: "❌ Error while claiming weekly reward.",
        ephemeral: true,
      });
    }
  },
};
