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
      return interaction.reply({ content: "❌ Could not find that member.", ephemeral: true });

    const activity = member.presence?.activities.find(
      act => act.name === "Spotify" && act.type === 2
    );

    if (!activity)
      return interaction.reply({
        content: "🎵 That user is not listening to Spotify right now.",
        ephemeral: true,
      });

    const title = activity.details;
    const artist = activity.state;
    const album = activity.assets?.largeText || "Unknown Album";
    const albumImage = activity.assets?.largeImage?.split(":")[1];

    const start = activity.timestamps.start;
    const end = activity.timestamps.end;
    const totalDuration = end - start;

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
      const filledLength = Math.round(progress * barLength);

      const bar = "▬".repeat(filledLength) + "🔘" + "▬".repeat(barLength - filledLength);

      return {
        bar,
        elapsed,
        progress,
      };
    };

    const trackUrl = `https://open.spotify.com/track/${activity.syncId}`;
    const artistUrl = `https://open.spotify.com/search/${encodeURIComponent(artist)}`;
    const albumUrl = `https://open.spotify.com/search/${encodeURIComponent(album)}`;

    const row = new ActionRowBuilder().addComponents(
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

    const buildEmbed = () => {
      const { bar, elapsed, progress } = buildProgressBar();
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
    };

    const message = await interaction.reply({
      embeds: [buildEmbed()],
      components: [row],
      fetchReply: true,
    });

    const interval = setInterval(async () => {
      try {
        const now = Date.now();

        if (now >= end + 2000) {
          clearInterval(interval);
          return;
        }

        await message.edit({
          embeds: [buildEmbed()],
          components: [row],
        });
      } catch (err) {
        clearInterval(interval);
      }
    }, 5000); 
  },
};
