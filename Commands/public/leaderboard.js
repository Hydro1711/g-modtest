const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the global chips leaderboard (all servers)."),

  async execute(interaction) {
    const client = interaction.client;

    try {
      const top = await User.aggregate([
        { $match: { chips: { $gt: 0 } } },
        {
          $project: {
            userId: "$userId",
            chips: "$chips",
          },
        },
        { $sort: { chips: -1 } },
        { $limit: 10 },
      ]);

      if (!top.length) {
        return interaction.reply({
          content: "🏆 Nobody has any chips yet.",
          ephemeral: true,
        });
      }

      const lines = [];

      for (let i = 0; i < top.length; i++) {
        const entry = top[i];
        const userId = entry.userId;
        const chips = entry.chips || 0;

        let displayName = `Unknown User (${userId})`;
        try {
          const user = await client.users.fetch(userId);
          if (user) displayName = user.tag;
        } catch {
          // ignore fetch errors
        }

        let prefix;
        if (i === 0) prefix = "🥇";
        else if (i === 1) prefix = "🥈";
        else if (i === 2) prefix = "🥉";
        else prefix = `#${i + 1}`;

        lines.push(`${prefix} **${displayName}** — ${chips.toLocaleString()} chips`);
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle("🏆 Global Chips Leaderboard")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Global across every server using this bot." })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /leaderboard:", err);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ content: "❌ Error while fetching leaderboard." });
      }
      await interaction.reply({
        content: "❌ Error while fetching leaderboard.",
        ephemeral: true,
      });
    }
  },
};
