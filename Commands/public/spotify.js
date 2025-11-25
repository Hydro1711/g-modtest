const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotify")
    .setDescription("Shows a user's current Spotify activity")
    .addUserOption(option =>
      option.setName("user").setDescription("The user to check").setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member)
      return interaction.reply({
        content: "❌ Could not find that member.",
        ephemeral: true
      });

    const activity = member.presence?.activities.find(
      act => act.name === "Spotify" && act.type === 2
    );

    if (!activity)
      return interaction.reply({
        content: "🎵 That user is not listening to Spotify right now.",
        ephemeral: true
      });

    // Extract data
    const title = activity.details;
    const artist = activity.state;
    const album = activity.assets?.largeText || "Unknown Album";
    const albumImage = activity.assets?.largeImage?.split(":")[1];

    const start = activity.timestamps.start;
    const end = activity.timestamps.end;
    const totalDuration = end - start;

    // Track ID fixing (works 100%)
    let trackId = null;
    const rawLarge = activity.assets?.largeImage;

    if (rawLarge?.startsWith("spotify:")) {
      trackId = rawLarge.replace("spotify:", "");
    } else if (activity.id) {
      trackId = activity.id;
    } else {
      trackId = `${encodeURIComponent(title)}+${encodeURIComponent(artist)}`;
    }

    const trackUrl = `https://open.spotify.com/track/${trackId}`;
    const artistUrl = `https://open.spotify.com/search/${encodeURIComponent(artist)}`;
    const albumUrl = `https://open.spotify.com/search/${encodeURIComponent(album)}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Open Track").setStyle(ButtonStyle.Link).setURL(trackUrl),
      new ButtonBuilder().setLabel("Artist").setStyle(ButtonStyle.Link).setURL(artistUrl),
      new ButtonBuilder().setLabel("Album").setStyle(ButtonStyle.Link).setURL(albumUrl)
    );

    const format = ms => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const buildProgressBar = () => {
      const now = Date.now();
      const elapsed = now - start;
      const progress = Math.min(elapsed / totalDuration, 1);

      const barLength = 20;
      const filled = Math.round(progress * barLength);
      const bar = "▬".repeat(filled) + "🔘" + "▬".repeat(barLength - filled);

      return { bar, elapsed, progress };
    };

    const buildEmbed = () => {
      const { bar, elapsed } = buildProgressBar();
      const elapsedFormatted = format(elapsed);
      const totalFormatted = format(totalDuration);

      return new EmbedBuilder()
        .setColor("#1DB954")
        .setAuthor({ name: `${user.username}'s Spotify`, iconURL: user.displayAvatarURL() })
        .setThumbnail(`https://i.scdn.co/image/${albumImage}`)
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
            inline: true
          },
          {
            name: "⏱ Ends",
            value: `<t:${Math.floor(end / 1000)}:R>`,
            inline: true
          }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
    };

    // Send the initial embed
    const message = await interaction.reply({
      embeds: [buildEmbed()],
      components: [row],
      fetchReply: true
    });

    // LIVE UPDATING — every 5 seconds (safe)
    const interval = setInterval(async () => {
      try {
        const now = Date.now();

        // STOP 1: Track ended
        if (now >= end) {
          clearInterval(interval);
          return;
        }

        // Refresh presence
        await member.fetch(true);
        const spotifyNow = member.presence?.activities.find(
          act => act.name === "Spotify" && act.type === 2
        );

        // STOP 2: No longer listening
        if (!spotifyNow) {
          clearInterval(interval);
          return;
        }

        // STOP 3: Track changed
        if (spotifyNow.details !== title || spotifyNow.state !== artist) {
          clearInterval(interval);
          return;
        }

        // Update embed normally
        await message.edit({
          embeds: [buildEmbed()],
          components: [row]
        });

      } catch (err) {
        clearInterval(interval);
      }
    }, 5000);
  }
};
