const {
  SlashCommandBuilder,
  EmbedBuilder,
  userMention,
  Colors
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays a fully enhanced user profile with live presence details.")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Select a user to view information about.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;
    const fetchedUser = await interaction.client.users.fetch(target.id, { force: true }).catch(() => target);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    // --- Presence / Status Handling ---
    const presence = member?.presence || null;
    const status = presence?.status || "offline";

    const statusColors = {
      online: Colors.Green,
      idle: Colors.Yellow,
      dnd: Colors.Red,
      offline: Colors.DarkButNotBlack,
      invisible: Colors.DarkGrey
    };

    let embedColor = statusColors[status] || Colors.Blurple;

    // --- Determine client type (Desktop / Mobile / Web) ---
    let clientType = "Unknown";
    const clientStatus = presence?.clientStatus;
    if (clientStatus) {
      const devices = Object.keys(clientStatus);
      clientType = devices
        .map(device =>
          device === "desktop"
            ? "🖥️ Desktop"
            : device === "mobile"
            ? "📱 Mobile"
            : "🌐 Web"
        )
        .join(", ");
    }

    // --- Avatar, Banner, and Nitro shimmer ---
    const avatarURL = fetchedUser.displayAvatarURL({ size: 1024, dynamic: true });
    const bannerURL = fetchedUser.bannerURL({ size: 2048, dynamic: true });
    const accentColor = fetchedUser.hexAccentColor;
    const hasNitro = fetchedUser.avatar?.startsWith("a_") || Boolean(bannerURL);

    if (hasNitro && bannerURL) {
      // add a subtle shimmer color shift to match Nitro profile feel
      embedColor = accentColor || Colors.Blurple;
    }

    // --- Account Info ---
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

    // --- Build final advanced embed ---
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${fetchedUser.tag} | Profile Summary`,
        iconURL: avatarURL
      })
      .setDescription(`${userMention(fetchedUser.id)}’s profile overview`)
      .setColor(embedColor)
      .setThumbnail(avatarURL)
      .addFields(
        { name: "🆔 Identifier", value: `\`${fetchedUser.id}\``, inline: true },
        { name: "📅 Created", value: created, inline: true },
        { name: "📥 Joined Server", value: joined, inline: true },
        { name: "🌐 Status", value: `\`${status.toUpperCase()}\``, inline: true },
        { name: "💻 Client Type", value: clientType, inline: true },
        { name: "⭐ Booster", value: boosting, inline: true },
        { name: "🎭 Top Role", value: member?.roles.highest?.toString() || "None", inline: true },
        { name: "🎨 Roles", value: roles, inline: false },
        {
          name: "🖼️ Avatar",
          value: `[Click to view](${avatarURL})`,
          inline: true
        },
        {
          name: "🏷️ Banner",
          value: bannerURL ? `[Click to view](${bannerURL})` : "None",
          inline: true
        }
      )
      .setFooter({
        text: hasNitro
          ? `Nitro User • Requested by ${interaction.user.tag}`
          : `Requested by ${interaction.user.tag}`
      })
      .setTimestamp();

    // Visually show banner if user has one
    if (bannerURL) embed.setImage(bannerURL);

    await interaction.reply({ embeds: [embed] });
  }
};
