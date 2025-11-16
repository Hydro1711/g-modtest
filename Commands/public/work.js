const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");
const getOrCreateUser = require('../../Functions/getOrCreateUser');

const WORK_COOLDOWN = 7 * 60 * 1000; // 7 minutes

const JOBS = [
  { name: "Developer", min: 200, max: 500 },
  { name: "Janitor", min: 100, max: 250 },
  { name: "Chef", min: 150, max: 350 },
  { name: "Streamer", min: 200, max: 600 },
  { name: "Cashier", min: 120, max: 300 },
  { name: "Mechanic", min: 180, max: 420 },
  { name: "Security Guard", min: 160, max: 360 },
  { name: "Taxi Driver", min: 140, max: 330 },
  { name: "Hacker", min: 350, max: 800 },
];

function formatShort(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes && seconds) return `${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work a job to earn chips (global, with cooldown)."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({ userId, chips: 0 });
      }

      if (user.lastWork) {
        const diff = now - user.lastWork.getTime();
        if (diff < WORK_COOLDOWN) {
          const remaining = WORK_COOLDOWN - diff;
          return interaction.reply({
            content: `⏳ You're tired. Try working again in **${formatShort(remaining)}**.`,
            ephemeral: true,
          });
        }
      }

      const job = JOBS[Math.floor(Math.random() * JOBS.length)];
      const amount = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

      user.chips = (user.chips || 0) + amount;
      user.lastWork = new Date(now);
      await user.save();

      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle("💼 Work Complete")
        .setDescription(`You worked as a **${job.name}** and earned **${amount.toLocaleString()} chips**.`)
        .addFields({ name: "Total Chips", value: `${user.chips.toLocaleString()}`, inline: true })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /work:", err);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ content: "❌ Error while processing work." });
      }
      await interaction.reply({
        content: "❌ Error while processing work.",
        ephemeral: true,
      });
    }
  },
};
