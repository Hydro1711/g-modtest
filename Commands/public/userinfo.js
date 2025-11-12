const {
  SlashCommandBuilder,
  EmbedBuilder,
  userMention,
  Colors,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays a dynamic, detailed user profile.")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Select a user to view information about.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;

    // Fetch full user for banner/accent color
    const fetchedUser = await interaction.client.users.fetch(target.id, { force: true }).catch(() => target);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    // --- Dynamic Embed Color based on presence ---
    let presenceColor = Colors.Blurple;
    if (member?.presence) {
      const status = member.presence.status;
      if (status === "online") presenceColor = Colors.Green;
      else if (status === "idle") presenceColor = Colors.Yellow;
      else if (status === "dnd") presenceColor = Colors.Red;
      else presenceColor = Colors.Grey;
    } else if (fetchedUser.hexAccentColor) {
      presenceColor = fetchedUser.hexAccentColor;
    }

    // URLs & data
    const avatarURL = fetchedUser.displayAvatarURL({ size: 1024, dynamic: true });
    const bannerURL = fetchedUser.bannerURL({ size: 2048, dynamic: true });
    const accentColor = fetchedUser.hexAccentColor;

    const created = `<t:${Math.floor(fetchedUser.createdTimestamp / 1000)}:D> (<t:${Math.floor(fetchedUser.createdTimestamp / 1000)}:R>)`;
    const joined = member?.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
      : "Unknown";

    const boosting = member?.premiumSince ? "✅ Boosting" : "❌ Not boosting";
    const roles =
      member?.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .slice(0, 10)
        .join(", ") || "None";

    // --- Build fancy embed ---
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${fetchedUser.tag} | General Information`,
        iconURL: avatarURL,
      })
      .setDescription(`${userMention(fetchedUser.id)}’s profile summary`)
      .setColor(presenceColor)
      .setThumbnail(avatarURL)
      .addFields(
        { name: "🆔 Identifier", value: `\`${fetchedUser.id}\``, inline: true },
        { name: "📅 Created", value: created, inline: true },
        { name: "📥 Joined Server", value: joined, inline: true },
        { name: "⭐ Booster", value: boosting, inline: true },
        { name: "🎭 Top Role", value: member?.roles.highest?.toString() || "None", inline: true },
        { name: "🎨 Roles", value: roles, inline: false },
        { name: "🖼️ Avatar", value: `[Click to view](${avatarURL})`, inline: true },
        { name: "🏷️ Banner", value: bannerURL ? `[Click to view](${bannerURL})` : "None", inline: true }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    // Add banner visually if exists
    if (bannerURL) embed.setImage(bannerURL);

    // If user has accent color and is offline, use it as embed color highlight
    if (!member?.presence && accentColor) embed.setColor(accentColor);

    await interaction.reply({ embeds: [embed] });
  },
};
