
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const { ClassicPro } = require("musicard");

// helper to format ms -> m:ss
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show a musicard-style now playing panel with controls."),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply({
        content: "❌ Nothing is currently playing.",
        ephemeral: true,
      });
    }

    const track = player.queue.current;
    const position = player.position || 0;
    const duration = track.duration || 0;

    const progress = duration > 0
      ? Math.min(100, Math.round((position / duration) * 100))
      : 0;

    const thumb =
      track.thumbnail ||
      track.displayThumbnail?.("hqdefault") ||
      track.artworkUrl ||
      "https://cdn.discordapp.com/embed/avatars/0.png";

    const buffer = await ClassicPro({
      thumbnailImage: thumb,
      backgroundColor: "#000000",
      progress,
      progressColor: "#22c55e",
      progressBarColor: "#111827",
      name: track.title?.slice(0, 60) || "Unknown track",
      nameColor: "#22c55e",
      author: `By ${track.author || "Unknown"}`,
      authorColor: "#e5e7eb",
      startTime: formatTime(position),
      endTime: formatTime(duration),
      timeColor: "#e5e7eb",
    });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("music-prev")
        .setEmoji("⏮️")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music-back")
        .setEmoji("⏪")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music-pause")
        .setEmoji("⏸️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("music-play")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("music-skip")
        .setEmoji("⏭️")
        .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("music-vol-down")
        .setEmoji("🔉")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music-vol-up")
        .setEmoji("🔊")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music-loop")
        .setEmoji("🔁")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music-refresh")
        .setEmoji("🎨")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("music-stop")
        .setEmoji("🛑")
        .setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setTitle("🎵 Now Playing:")
      .setDescription(`${track.title} — *${track.author || "Unknown"}*`);

    const msg = await interaction.reply({
      embeds: [embed],
      files: [{ attachment: buffer, name: "nowplaying.png" }],
      components: [row1, row2],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "This panel isn't for you.", ephemeral: true });
      }

      const player = client.manager.players.get(interaction.guild.id);
      if (!player || !player.queue.current) {
        return i.reply({ content: "Nothing is playing anymore.", ephemeral: true });
      }

      const subTrack = player.queue.current;

      try {
        switch (i.customId) {
          case "music-pause":
            if (!player.paused) player.pause(true);
            break;
          case "music-play":
            if (player.paused) player.pause(false);
            break;
          case "music-skip":
            player.stop();
            break;
          case "music-stop":
            player.destroy();
            collector.stop("stopped");
            break;
          case "music-vol-down":
            player.setVolume(Math.max(5, (player.volume || 100) - 10));
            break;
          case "music-vol-up":
            player.setVolume(Math.min(150, (player.volume || 100) + 10));
            break;
          case "music-loop":
            player.setTrackRepeat(!player.trackRepeat);
            break;
          case "music-back":
            player.seek(Math.max(0, player.position - 10_000));
            break;
          case "music-prev":
            if (player.queue.previous) {
              player.queue.unshift(player.queue.previous);
              player.stop();
            }
            break;
          case "music-refresh":
            // regenerate card with updated progress
            const pos = player.position || 0;
            const dur = subTrack.duration || 0;
            const prog = dur > 0
              ? Math.min(100, Math.round((pos / dur) * 100))
              : 0;

            const thumb2 =
              subTrack.thumbnail ||
              subTrack.displayThumbnail?.("hqdefault") ||
              subTrack.artworkUrl ||
              "https://cdn.discordapp.com/embed/avatars/0.png";

            const buf2 = await ClassicPro({
              thumbnailImage: thumb2,
              backgroundColor: "#000000",
              progress: prog,
              progressColor: "#22c55e",
              progressBarColor: "#111827",
              name: subTrack.title?.slice(0, 60) || "Unknown track",
              nameColor: "#22c55e",
              author: `By ${subTrack.author || "Unknown"}`,
              authorColor: "#e5e7eb",
              startTime: formatTime(pos),
              endTime: formatTime(dur),
              timeColor: "#e5e7eb",
            });

            await i.update({
              embeds: [embed],
              files: [{ attachment: buf2, name: "nowplaying.png" }],
              components: [row1, row2],
            });
            return;
        }

        await i.deferUpdate().catch(() => {});
      } catch (err) {
        console.error("Error handling music control button:", err);
        if (!i.replied && !i.deferred) {
          await i.reply({ content: "Error handling that control.", ephemeral: true }).catch(() => {});
        }
      }
    });

    collector.on("end", async () => {
      try {
        const disabled1 = new ActionRowBuilder().addComponents(
          row1.components.map(c => ButtonBuilder.from(c).setDisabled(true))
        );
        const disabled2 = new ActionRowBuilder().addComponents(
          row2.components.map(c => ButtonBuilder.from(c).setDisabled(true))
        );
        await msg.edit({ components: [disabled1, disabled2] }).catch(() => {});
      } catch {}
    });
  },
};
