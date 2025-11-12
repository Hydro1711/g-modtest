const {
  SlashCommandBuilder,
  EmbedBuilder,
  userMention,
  Colors,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays a detailed, dynamic user profile.")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Select a user to view information about.")
        .setRequired(false)
    ),

  async execute(interaction) {
    // 🕐 Step 1 — Defer immediately to prevent "Unknown interaction"
    await interaction.deferReply({ ephemeral: false }).catch(() => {});

    const target = interaction.options.getUser("target") || interaction.user;

    // Fetch full user object for banner / accent color
    const fetchedUser = await interaction.client.users
      .fetch(target.id, { force: true })
      .catch(() => target);

    // Fetch full guild member for roles, presence, etc.
    let member = await interaction.guild.members.fetch(target.id).catch(() => null);

    // ---------- Presence & Status ----------
    let presence = member?.presence || null;
    if (!presence && member) {
      try {
        const fresh = await interaction.guild.members.fetch(member.id, { withPresences: true });
        member = fresh;
        presence = fresh.presence;
      } catch {
        presence = null;
      }
    }

    const rawStatus = presence?.status || "offline";
    const statusLabelMap = {
      online: "🟢 Online",
      idle: "🌙 Idle",
      dnd: "⛔ Do Not Disturb",
      offline: "⚫ Offline / Invisible",
      invisible: "⚫ Offline / Invisible",
    };
    const statusText = statusLabelMap[rawStatus] || "⚫ Offline / Invisible";

    // Dynamic color based on status
    const statusColorMap = {
      online: Colors.Green,
      idle: Colors.Yellow,
      dnd: Colors.Red,
      offline: Colors.DarkButNotBlack,
      invisible: Colors.DarkGrey,
    };
    let embedColor = statusColorMap[rawStatus] || Colors.Blurple;

    // ---------- Client Type ----------
    let clientType = "Unknown";
    const clientStatus = presence?.clientStatus;
    if (clientStatus) {
      const devices = Object.keys(clientStatus);
      const mapped = devices.map(device =>
        device === "desktop"
          ? "🖥️ Desktop"
          : device === "mobile"
          ? "📱 Mobile"
          : "🌐 Web"
      );
      if (mapped.length > 0) clientType = mapped.join(", ");
    }

    // ---------- Avatar / Banner / Nitro ----------
    const avatarURL = fetchedUser.displayAvatarURL({
      size: 1024,
      dynamic: true,
    });
    const bannerURL = fetchedUser.bannerURL({
      size: 2048,
      dynamic: true,
    });
    const accentColor = fetchedUser.hexAccentColor || null;

    const hasAnimatedAvatar =
      typeof fetchedUser.avatar === "string" &&
      fetchedUser.avatar.startsWith("a_");
    const hasBanner = Boolean(bannerURL);
    const hasNitro = hasAnimatedAvatar || hasBanner || Boolean(accentColor);

    if (hasNitro && accentColor) embedColor = accentColor;

    // ---------- Dates ----------
    const createdTs = Math.floor(fetchedUser.createdTimestamp / 1000);
    const created = `<t:${createdTs}:D> (<t:${createdTs}:R>)`;

    let joined = "Unknown";
    if (member?.joinedTimestamp) {
      const joinedTs = Math.floor(member.joinedTimestamp / 1000);
      joined = `<t:${joinedTs}:D> (<t:${joinedTs}:R>)`;
    }

    // ---------- Roles ----------
    const roles =
      member?.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .slice(0, 10)
        .join(", ") || "None";

    const topRole = member?.roles.highest?.toString() || "None";
    const boosting = member?.premiumSince ? "✅ Yes" : "❌ No";

    // ---------- Build Embed ----------
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${fetchedUser.tag} | Profile Summary`,
        iconURL: avatarURL,
      })
      .setDescription(`${userMention(fetchedUser.id)}’s profile overview`)
      .setColor(embedColor)
      .setThumbnail(avatarURL)
      .addFields(
        { name: "🆔 Identifier", value: `\`${fetchedUser.id}\``, inline: true },
        { name: "📅 Created", value: created, inline: true },
        { name: "📥 Joined Server", value: joined, inline: true },
        { name: "🌐 Status", value: statusText, inline: true },
        { name: "💻 Client Type", value: clientType, inline: true },
        { name: "⭐ Booster", value: boosting, inline: true },
        { name: "🎭 Top Role", value: topRole, inline: true },
        { name: "🎨 Roles", value: roles, inline: false },
        { name: "🖼️ Avatar", value: `[Click to view](${avatarURL})`, inline: true },
        {
          name: "🏷️ Banner",
          value: bannerURL ? `[Click to view](${bannerURL})` : "None",
          inline: true,
        }
      )
      .setFooter({
        text: hasNitro
          ? `Nitro User • Requested by ${interaction.user.tag}`
          : `Requested by ${interaction.user.tag}`,
      })
      .setTimestamp();

    if (bannerURL) embed.setImage(bannerURL);

    await interaction.editReply({ embeds: [embed] }).catch(console.error);
  },
};
