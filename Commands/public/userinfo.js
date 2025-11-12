const {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  userMention,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays a detailed and dynamic user profile.")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Select a user to view information about.")
        .setRequired(false)
    ),

  async execute(interaction) {
    let replied = false;
    try {
      await interaction.deferReply({ ephemeral: false });
      replied = true;
    } catch (err) {
      console.warn("[userinfo] Failed to defer:", err.message);
    }

    const target = interaction.options.getUser("target") || interaction.user;
    const client = interaction.client;

    const fetchedUser = await client.users.fetch(target.id, { force: true }).catch(() => target);
    let member = await interaction.guild.members.fetch(target.id).catch(() => null);

    // Refresh presence if missing
    let presence = member?.presence;
    if (!presence && member) {
      try {
        const fresh = await interaction.guild.members.fetch(member.id, { withPresences: true });
        member = fresh;
        presence = fresh.presence;
      } catch {
        presence = null;
      }
    }

    // Status icons & colors
    const statusIcons = {
      online: "🟢 Online",
      idle: "🌙 Idle",
      dnd: "⛔ Do Not Disturb",
      offline: "⚫ Offline / Invisible",
      invisible: "⚫ Offline / Invisible",
    };
    const statusColors = {
      online: Colors.Green,
      idle: Colors.Yellow,
      dnd: Colors.Red,
      offline: Colors.DarkButNotBlack,
      invisible: Colors.DarkGrey,
    };
    const rawStatus = presence?.status || "offline";
    const statusText = statusIcons[rawStatus] || "⚫ Offline / Invisible";
    let embedColor = statusColors[rawStatus] || Colors.Blurple;

    // Client device type
    let clientType = "⚫ Offline";
    const clientStatus = presence?.clientStatus;
    if (clientStatus && Object.keys(clientStatus).length > 0) {
      const deviceMap = {
        desktop: "🖥️ Desktop",
        mobile: "📱 Mobile",
        web: "🌐 Web",
      };
      clientType = Object.keys(clientStatus)
        .map(device => deviceMap[device] || device)
        .join(", ");
    }

    // Avatar, banner, accent
    const avatarURL = fetchedUser.displayAvatarURL({ size: 1024, dynamic: true });
    const bannerURL = fetchedUser.bannerURL({ size: 2048, dynamic: true });
    const accentColor = fetchedUser.hexAccentColor || null;

    const hasAnimatedAvatar = fetchedUser.avatar?.startsWith("a_");
    const hasBanner = Boolean(bannerURL);
    const hasNitro = hasAnimatedAvatar || hasBanner || Boolean(accentColor);

    if (hasNitro && accentColor) embedColor = accentColor;

    // Timestamps
    const createdTs = Math.floor(fetchedUser.createdTimestamp / 1000);
    const created = `<t:${createdTs}:D> (<t:${createdTs}:R>)`;

    let joined = "Unknown";
    if (member?.joinedTimestamp) {
      const joinedTs = Math.floor(member.joinedTimestamp / 1000);
      joined = `<t:${joinedTs}:D> (<t:${joinedTs}:R>)`;
    }

    // Join position
    let joinPosition = "Unknown";
    if (member) {
      const members = (await interaction.guild.members.fetch()).sort(
        (a, b) => a.joinedTimestamp - b.joinedTimestamp
      );
      const position = [...members.keys()].indexOf(member.id) + 1;
      joinPosition = `#${position} / ${members.size}`;
    }

    // Roles
    const roles =
      member?.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .slice(0, 10)
        .join(" ") || "None";

    const topRole = member?.roles.highest?.toString() || "None";
    const boosting = member?.premiumSince ? "✅ Yes" : "❌ No";

    // Build embed
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
        { name: "📊 Join Position", value: joinPosition, inline: true },
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
          ? `✨ Nitro User • Requested by ${interaction.user.tag}`
          : `Requested by ${interaction.user.tag}`,
      })
      .setTimestamp();

    if (bannerURL) embed.setImage(bannerURL);

    // Send safely
    try {
      if (replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.followUp({ embeds: [embed], ephemeral: false });
      }
    } catch (err) {
      console.error("[userinfo] Send failed:", err);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Failed to send user info embed.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
