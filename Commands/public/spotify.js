const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

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
    if (!member) return interaction.reply({ content: "❌ Could not find that member.", ephemeral: true });

    const spotifyActivity = member.presence?.activities.find(act => act.name === "Spotify" && act.type === 2);
    if (!spotifyActivity)
      return interaction.reply({ content: "🎵 That user is not listening to Spotify right now.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle(`🎶 ${spotifyActivity.details}`)
      .setDescription(`**Artist:** ${spotifyActivity.state}\n**Album:** ${spotifyActivity.assets?.largeText || "Unknown"}`)
      .setThumbnail(`https://i.scdn.co/image/${spotifyActivity.assets?.largeImage?.split(":")[1]}`)
      .setColor("Green")
      .addFields({ name: "🎧 Listening Since", value: `<t:${Math.floor(spotifyActivity.timestamps.start / 1000)}:R>` })
      .setFooter({ text: `Requested by ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  },
};
