
const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("View the current music queue."),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player || (!player.queue.current && !player.queue.size)) {
      return interaction.reply({
        content: "❌ There is nothing in the queue.",
        ephemeral: true,
      });
    }

    const current = player.queue.current;
    const tracks = player.queue;

    const lines = [];
    tracks.forEach((t, i) => {
      if (i > 9) return;
      lines.push(`**${i + 1}.** ${t.title} — *${t.author || "Unknown"}*`);
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle("📜 Current Queue")
      .addFields(
        {
          name: "Now Playing",
          value: current ? `**${current.title}** — *${current.author || "Unknown"}*` : "Nothing",
        },
        {
          name: "Up Next",
          value: lines.length ? lines.join("\n") : "No more songs in queue.",
        }
      );

    return interaction.reply({ embeds: [embed] });
  },
};
