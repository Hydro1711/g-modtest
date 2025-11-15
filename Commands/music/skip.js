
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current track."),

  async execute(interaction, client) {
    const { guild, member } = interaction;

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ You must be in a voice channel to use /skip.",
        ephemeral: true,
      });
    }

    const player = client.manager.players.get(guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply({
        content: "❌ Nothing is currently playing.",
        ephemeral: true,
      });
    }

    if (player.voiceChannel !== voiceChannel.id) {
      return interaction.reply({
        content: "❌ You must be in the same voice channel as me to skip.",
        ephemeral: true,
      });
    }

    player.stop();
    return interaction.reply({ content: "⏭ Skipped the current track." });
  },
};
