const {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors
} = require("discord.js");

// Uses existing Lavalink+Erela.js manager: client.manager
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

    await interaction.deferReply();

    try {
      const res = await client.manager.search(query, interaction.user);

      if (!res || !res.tracks.length) {
        return interaction.editReply({
          content: "❌ No results found for that query.",
        });
      }

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
          content: "❌ I'm already playing in another voice channel.",
        });
      }

      if (res.loadType === "PLAYLIST_LOADED") {
        res.tracks.forEach((t) => player.queue.add(t));
        if (!player.playing && !player.paused && !player.queue.current) {
          player.play();
        }
        const embed = new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("📃 Playlist added")
          .setDescription(
            `Added **${res.tracks.length}** tracks from playlist **${res.playlist.name}** to the queue.`
          );

        return interaction.editReply({ embeds: [embed] });
      } else {
        const track = res.tracks[0];
        player.queue.add(track);

        if (!player.playing && !player.paused && !player.queue.current) {
          player.play();
        }

        const embed = new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("🎵 Track added")
          .setDescription(`Queued: **${track.title}**`)
          .setFooter({ text: `Requested by ${interaction.user.tag}` });

        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("Error in /play:", err);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: "❌ There was an error while searching/playing that track.",
        });
      }
      await interaction.reply({
        content: "❌ There was an error while searching/playing that track.",
        ephemeral: true,
      });
    }
  },
};
