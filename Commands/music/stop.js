
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the music and clear the queue."),

  async execute(interaction, client) {
    const { guild, member } = interaction;

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ You must be in a voice channel to use /stop.",
        ephemeral: true,
      });
    }

    const player = client.manager.players.get(guild.id);
    if (!player) {
      return interaction.reply({
        content: "❌ There is no active player.",
        ephemeral: true,
      });
    }

    if (player.voiceChannel !== voiceChannel.id) {
      return interaction.reply({
        content: "❌ You must be in the same voice channel as me to stop the music.",
        ephemeral: true,
      });
    }

    player.destroy();
    return interaction.reply({ content: "🛑 Stopped playback and cleared the queue." });
  },
};
