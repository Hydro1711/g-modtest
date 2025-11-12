const { SlashCommandBuilder, EmbedBuilder, userMention } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Displays detailed information about a user.")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("Select a user to view info about.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    // Embed color — your theme
    const color = "#2b6cb0";

    // Account creation and join dates
    const created = `<t:${Math.floor(target.createdTimestamp / 1000)}:D> (<t:${Math.floor(target.createdTimestamp / 1000)}:R>)`;
    const joined = member?.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`
      : "Unknown";

    // Roles
    const roles = member
      ? member.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r)
          .slice(0, 10)
          .join(" ") || "None"
      : "None";

    // Boosting
    const boosting = member?.premiumSince ? "✅ Boosting" : "❌ Not boosting";

    // Avatar and banner
    const avatarURL = target.displayAvatarURL({ size: 512, dynamic: true });
    const bannerURL = target.bannerURL({ size: 512, dynamic: true });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${target.tag} | General Information`,
        iconURL: avatarURL,
      })
      .setColor(color)
      .setDescription(
        `${userMention(target.id)} joined **${interaction.guild.name}** ${
          member
            ? `as the **${interaction.guild.memberCount}ᵗʰ** member.`
            : ""
        }`
      )
      .addFields(
        { name: "👤 User", value: `${target}`, inline: true },
        { name: "🆔 Identifier", value: `\`${target.id}\``, inline: true },
        { name: "📅 Created", value: created, inline: false },
        { name: "📥 Joined Server", value: joined, inline: true },
        { name: "⭐ Booster", value: boosting, inline: true },
        { name: "🎭 Top Role", value: member?.roles.highest || "None", inline: true },
        { name: "🎨 Roles", value: roles, inline: false },
        { name: "🖼️ Avatar", value: `[Link](${avatarURL})`, inline: true },
        { name: "🏷️ Banner", value: bannerURL ? `[Link](${bannerURL})` : "None", inline: true }
      )
      .setThumbnail(avatarURL)
      .setImage(bannerURL || null)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
