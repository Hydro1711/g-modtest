const {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song or playlist through Lavalink.")
    .addStringOption(opt =>
      opt
        .setName("query")
        .setDescription("YouTube / URL / search query.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const query = interaction.options.getString("query");
    const { guild, member, channel } = interaction;

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ You must be in a voice channel to use /play.",
        ephemeral: true,
      });
    }

    // --- SAFETY CHECK: Lavalink node online ---
    const node = client.manager.nodes.get("main");
    if (!node || !node.connected) {
      return interaction.reply({
        content: "❌ Lavalink node is not connected. Try again in a few seconds.",
        ephemeral: true,
      });
    }

    await interaction.deferReply().catch(() => {});

    try {
      // --- SEARCH ---
      const res = await client.manager.search(query, interaction.user).catch(() => null);

      if (!res || !res.tracks.length) {
        return interaction.editReply({ content: "❌ No results found." });
      }

      // --- PLAYER ---
      let player = client.manager.players.get(guild.id);

      if (!player) {
        player = client.manager.create({
          guild: guild.id,
          voiceChannel: voiceChannel.id,
          textChannel: channel.id,
          selfDeafen: true,
        });

        player.connect();
      } else if (player.voiceChannel !== voiceChannel.id) {
        return interaction.editReply({
          content: "❌ I'm already playing in a different voice channel.",
        });
      }

      // --- ADD PLAYLIST ---
      if (res.loadType === "PLAYLIST_LOADED") {
        for (const track of res.tracks) player.queue.add(track);

        if (!player.playing && !player.paused && !player.queue.current) {
          player.play();
        }

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Green)
              .setTitle("📃 Playlist added")
              .setDescription(
                `Added **${res.tracks.length}** tracks from playlist:\n**${res.playlist.name}**`
              ),
          ],
        });
      }

      // --- ADD SINGLE TRACK ---
      const track = res.tracks[0];
      player.queue.add(track);

      if (!player.playing && !player.paused && !player.queue.current) {
        player.play();
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle("🎵 Track Added")
            .setDescription(`**${track.title}**`)
            .setFooter({ text: `Requested by ${interaction.user.tag}` }),
        ],
      });

    } catch (err) {
      console.error("🔥 /play ERROR:", err);

      if (interaction.deferred) {
        return interaction.editReply({
          content: "❌ An unexpected error occurred while playing the track.",
        });
      }

      return interaction.reply({
        content: "❌ An unexpected error occurred.",
        ephemeral: true,
      });
    }
  },
};
