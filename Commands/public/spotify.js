const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify")
    .setDescription("Shows a user's current Spotify activity")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to check")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Acknowledge the interaction so it can't expire
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("user") || interaction.user;

    // Fetch member (for presence)
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.editReply({
        content: "❌ Could not find that member.",
      });
    }

    // Case-insensitive Spotify presence detection
    const activity = member.presence?.activities.find(
      act =>
        act.type === 2 && // LISTENING
        act.name &&
        act.name.toLowerCase() === "spotify"
    );

    if (!activity) {
      return interaction.editReply({
        content: "🎵 That user is not listening to Spotify right now.",
      });
    }

    // --------- Extract Spotify data ---------
    const title = activity.details; // Track name
    const artist = activity.state;  // Artist name(s)
    const album = activity.assets?.largeText || "Unknown Album";

    const albumImageId = activity.assets?.largeImage?.split(":")[1];
    const albumImageUrl = albumImageId
      ? `https://i.scdn.co/image/${albumImageId}`
      : null;

    const start = activity.timestamps.start;
    const end = activity.timestamps.end;
    const totalDuration = end - start;

    // Track ID extraction (most reliable path)
    let trackId = null;
    const rawLarge = activity.assets?.largeImage;

    if (rawLarge?.startsWith("spotify:")) {
      trackId = rawLarge.replace("spotify:", "");
    } else if (activity.syncId) {
      trackId = activity.syncId;
    } else if (activity.id) {
      trackId = activity.id;
    }

    const trackUrl = trackId
      ? `https://open.spotify.com/track/${trackId}`
      : `https://open.spotify.com/search/${encodeURIComponent(title + " " + artist)}`;

    const artistUrl = `https://open.spotify.com/search/${encodeURIComponent(artist)}`;
    const albumUrl = `https://open.spotify.com/search/${encodeURIComponent(album)}`;

    // ---------- Helpers ----------
    const formatMs = ms => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const buildProgressBar = () => {
      const now = Date.now();
      const elapsed = now - start;
      const clampedElapsed = Math.max(0, Math.min(elapsed, totalDuration));
      const progress = clampedElapsed / totalDuration;

      const barLength = 20;
      const filled = Math.round(progress * barLength);
      const bar = "▬".repeat(filled) + "🔘" + "▬".repeat(barLength - filled);

      return {
        bar,
        elapsed: clampedElapsed,
      };
    };

    const buildEmbed = () => {
      const { bar, elapsed } = buildProgressBar();
      const elapsedFormatted = formatMs(elapsed);
      const totalFormatted = formatMs(totalDuration);

      const embed = new EmbedBuilder()
        .setColor("#1DB954") // Spotify green
        .setAuthor({
          name: `${user.username}'s Spotify`,
          iconURL: user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle(`🎶 ${title}`)
        .setDescription(
          `**Artist:** ${artist}\n` +
          `**Album:** ${album}\n\n` +
          `\`${elapsedFormatted}\` ${bar} \`${totalFormatted}\`\n`
        )
        .addFields(
          {
            name: "🕒 Started",
            value: `<t:${Math.floor(start / 1000)}:R>`,
            inline: true,
          },
          {
            name: "⏱ Ends",
            value: `<t:${Math.floor(end / 1000)}:R>`,
            inline: true,
          }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();

      if (albumImageUrl) {
        embed.setThumbnail(albumImageUrl);
      }

      return embed;
    };

    // ---------- Buttons ----------
    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Track")
        .setStyle(ButtonStyle.Link)
        .setURL(trackUrl),
      new ButtonBuilder()
        .setLabel("Artist")
        .setStyle(ButtonStyle.Link)
        .setURL(artistUrl),
      new ButtonBuilder()
        .setLabel("Album")
        .setStyle(ButtonStyle.Link)
        .setURL(albumUrl)
    );

    // ---------- Send initial message ----------
    const message = await interaction.editReply({
      embeds: [buildEmbed()],
      components: [buttonsRow],
    });

    // ---------- Live updating progress bar (every 5s) ----------
    const interval = setInterval(async () => {
      try {
        const now = Date.now();

        // Stop if track time has passed
        if (now >= end) {
          clearInterval(interval);
          return;
        }

        // Refresh member presence each tick
        await member.fetch(true);

        const currentSpotify = member.presence?.activities.find(
          act =>
            act.type === 2 &&
            act.name &&
            act.name.toLowerCase() === "spotify"
        );

        // Stop if they stopped listening
        if (!currentSpotify) {
          clearInterval(interval);
          return;
        }

        // Stop if they changed track (title or artist changed)
        if (
          currentSpotify.details !== title ||
          currentSpotify.state !== artist
        ) {
          clearInterval(interval);
          return;
        }

        // Update the progress bar + times
        await message.edit({
          embeds: [buildEmbed()],
          components: [buttonsRow],
        });
      } catch {
        clearInterval(interval);
      }
    }, 5000); // 5 seconds
  },
};
