const {
  SlashCommandBuilder,
  EmbedBuilder,
  userMention,
  Colors
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays a detailed and modern user profile.")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Select a user to view information about.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;

    // Refetch full user to get banner and accent color
    const fetchedUser = await interaction.client.users.fetch(target.id, { force: true }).catch(() => target);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const avatarURL = fetchedUser.displayAvatarURL({ size: 1024, dynamic: true });
    const bannerURL = fetchedUser.bannerURL({ size: 2048, dynamic: true });
    const accentColor = fetchedUser.hexAccentColor || Colors.Blurple;

    const badges = [];
    const flags = fetchedUser.flags?.toArray() || [];

    // Common Discord badges
    const badgeMap = {
      Staff: "👑 Discord Staff",
      Partner: "💎 Partnered Server Owner",
      BugHunterLevel1: "🐛 Bug Hunter (Lv1)",
      BugHunterLevel2: "🐞 Bug Hunter (Lv2)",
      HypeSquadOnlineHouse1: "🏠 HypeSquad Bravery",
      HypeSquadOnlineHouse2: "🏡 HypeSquad Brilliance",
      HypeSquadOnlineHouse3: "🏘️ HypeSquad Balance",
      Hypesquad: "🎪 HypeSquad Events",
      CertifiedModerator: "🛡️ Certified Moderator",
      ActiveDeveloper: "🧠 Active Developer",
      VerifiedBot: "✅ Verified Bot",
      VerifiedBotDeveloper: "⚙️ Verified Bot Developer"
    };

    for (const flag of flags) {
      if (badgeMap[flag]) badges.push(badgeMap[flag]);
    }

    const joined = member?.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
      : "Unknown";

    const created = `<t:${Math.floor(fetchedUser.createdTimestamp / 1000)}:D> (<t:${Math.floor(fetchedUser.createdTimestamp / 1000)}:R>)`;

    const roles = member
      ? member.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.toString())
          .slice(0, 10)
          .join(", ") || "None"
      : "None";

    const permissions = member
      ? member.permissions.toArray().slice(0, 5).join(", ").replace(/_/g, " ").toLowerCase() || "None"
      : "Unknown";

    const boosting = member?.premiumSince ? "✅ Yes" : "❌ No";

    // Dynamic accent color from profile if available
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${fetchedUser.tag} (${fetchedUser.id})`,
        iconURL: avatarURL
      })
      .setColor(accentColor)
      .setThumbnail(avatarURL)
      .setDescription(`${userMention(fetchedUser.id)}’s detailed profile information.`)
      .addFields(
        { name: "📅 Account Created", value: created, inline: true },
        { name: "📥 Joined Server", value: joined, inline: true },
        { name: "🎭 Top Role", value: member?.roles.highest?.toString() || "None", inline: true },
        { name: "🎨 Roles", value: roles, inline: false },
        { name: "🔧 Key Permissions", value: `\`${permissions}\``, inline: false },
        { name: "⭐ Server Booster", value: boosting, inline: true },
        {
          name: "🏷️ Badges",
          value: badges.length ? badges.map(b => `• ${b}`).join("\n") : "None",
          inline: false
        },
        {
          name: "🖼️ Avatar & Banner",
          value: `[Avatar Link](${avatarURL}) ${
            bannerURL ? `| [Banner Link](${bannerURL})` : ""
          }`,
          inline: false
        }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    if (bannerURL) embed.setImage(bannerURL);

    await interaction.reply({ embeds: [embed] });
  },
};
