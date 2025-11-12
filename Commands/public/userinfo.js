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
    await interaction.deferReply({ ephemeral: false }).catch(() => {});

    const target = interaction.options.getUser("target") || interaction.user;
    const fetchedUser = await interaction.client.users
      .fetch(target.id, { force: true })
      .catch(() => target);
    let member = await interaction.guild.members.fetch(target.id).catch(() => null);

    // Presence Handling
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

    // Status Mapping
    const rawStatus = presence?.status || "offline";
    const statusLabelMap = {
      online: "🟢 Online",
      idle: "🌙 Idle",
      dnd: "⛔ Do Not Disturb",
      offline: "⚫ Offline / Invisible",
      invisible: "⚫ Offline / Invisible",
    };
    const statusEmojiMap = {
      online: "🟢",
      idle: "🌙",
      dnd: "⛔",
      offline: "⚫",
      invisible: "⚫",
    };
    const statusText = statusLabelMap[rawStatus] || "⚫ Offline / Invisible";
    const statusEmoji = statusEmojiMap[rawStatus] || "⚫";

    // Dynamic color
    const statusColorMap = {
      online: Colors.Green,
      idle: Colors.Yellow,
      dnd: Colors.Red,
      offline: Colors.DarkButNotBlack,
      invisible: Colors.DarkGrey,
    };
    let embedColor = statusColorMap[rawStatus] || Colors.Blurple;

    // Client Type
    let clientType = "⚫ Offline";
    const clientStatus = presence?.clientStatus;
    if (clientStatus && Object.keys(clientStatus).length > 0) {
      const deviceMap = {
        desktop: "🖥️ Desktop",
        mobile: "📱 Mobile",
        web: "🌐 Web",
      };
      const devices = Object.keys(clientStatus)
        .map(device => deviceMap[device] || device)
        .join(", ");
      clientType = devices || "Unknown";
    }

    // Visuals (Avatar, Banner, Nitro)
    const avatarURL = fetchedUser.displayAvatarURL({ size: 1024, dynamic: true });
    const bannerURL = fetchedUser.bannerURL({ size: 2048, dynamic: true });
    const accentColor = fetchedUser.hexAccentColor || null;

    const hasAnimatedAvatar =
      typeof fetchedUser.avatar === "string" && fetchedUser.avatar.startsWith("a_");
    const hasBanner = Boolean(bannerURL);
    const hasNitro = hasAnimatedAvatar || hasBanner || Boolean(accentColor);

    if (hasNitro && accentColor) embedColor = accentColor;

    // Dates
    const createdTs = Math.floor(fetchedUser.createdTimestamp / 1000);
    const created = `<t:${createdTs}:D> (<t:${createdTs}:R>)`;

    let joined = "Unknown";
    if (member?.joinedTimestamp) {
      const joinedTs = Math.floor(member.joinedTimestamp / 1000);
      joined = `<t:${joinedTs}:D> (<t:${joinedTs}:R>)`;
    }

    // Roles
    const roles =
      member?.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .slice(0, 10)
        .join(", ") || "None";

    const topRole = member?.roles.highest?.toString() || "None";
    const boosting = member?.premiumSince ? "✅ Yes" : "❌ No";

    // Join Position
    let joinPosition = "Unknown";
    try {
      const members = await interaction.guild.members.fetch();
      const sorted = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
      joinPosition = `#${sorted.map(m => m.id).indexOf(member.id) + 1} / ${members.size}`;
    } catch {
      joinPosition = "Unknown";
    }

    // ✨ Nitro badge shimmer
    const nitroBadge = hasNitro ? "✨" : "";

    // Developer Mode Footer
    const footerText =
      interaction.user.id === "582502664252686356"
        ? `🧠 Developer Mode • ${interaction.client.user.username}`
        : hasNitro
        ? `Nitro User • Requested by ${interaction.user.tag}`
        : `Requested by ${interaction.user.tag}`;

    // Build Embed
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${statusEmoji} ${fetchedUser.tag} | Profile Summary`,
        iconURL: avatarURL,
      })
      .setTitle(`${nitroBadge} ${fetchedUser.username}’s Profile ${nitroBadge}`)
      .setDescription(`${userMention(fetchedUser.id)}’s profile overview`)
      .setColor(embedColor)
      .setThumbnail(avatarURL)
      .addFields(
        { name: "🆔 Identifier", value: `\`${fetchedUser.id}\``, inline: true },
        { name: "📅 Created", value: created, inline: true },
        { name: "📥 Joined Server", value: joined, inline: true },
        { name: "📊 Join Position", value: joinPosition, inline: true },
        { name: "🌐 Status", value: statusText, inline: true },
        { name: "💻 Client Type", value: clientType, inline: true },
        { name: "⭐ Booster", value: boosting, inline: true },
        { name: "🎭 Top Role", value: topRole, inline: true },
        { name: "🎨 Roles", value: roles, inline: false },
        { name: "🖼️ Avatar", value: `[Click to view](${avatarURL})`, inline: true },
        { name: "🏷️ Banner", value: bannerURL ? `[Click to view](${bannerURL})` : "None", inline: true }
      )
      .setFooter({ text: footerText })
      .setTimestamp();

    if (bannerURL) embed.setImage(bannerURL);

    await interaction.editReply({ embeds: [embed] }).catch(console.error);
  },
};
