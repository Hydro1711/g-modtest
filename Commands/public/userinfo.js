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
    // ✅ 1. Instantly acknowledge the interaction (prevents 'Unknown interaction')
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: false });
      }
    } catch (err) {
      console.warn("[userinfo] Failed to defer interaction:", err.message);
      return;
    }

    try {
      const target = interaction.options.getUser("target") || interaction.user;
      const fetchedUser = await interaction.client.users
        .fetch(target.id, { force: true })
        .catch(() => target);
      let member = await interaction.guild.members.fetch(target.id).catch(() => null);

      // ✅ fetch presence safely
      let presence = member?.presence || null;
      if (!presence && member) {
        try {
          const fresh = await interaction.guild.members.fetch({
            user: member.id,
            withPresences: true,
            force: true,
          });
          member = fresh;
          presence = fresh.presence;
        } catch {}
      }

      // --- STATUS ---
      const rawStatus = presence?.status || "offline";
      const statusLabelMap = {
        online: "🟢 Online",
        idle: "🌙 Idle",
        dnd: "⛔ Do Not Disturb",
        offline: "⚫ Offline / Invisible",
        invisible: "⚫ Offline / Invisible",
      };
      const statusText = statusLabelMap[rawStatus] || "⚫ Offline / Invisible";
      const statusColorMap = {
        online: Colors.Green,
        idle: Colors.Yellow,
        dnd: Colors.Red,
        offline: Colors.DarkButNotBlack,
        invisible: Colors.DarkGrey,
      };
      let embedColor = statusColorMap[rawStatus] || Colors.Blurple;

      // --- DEVICE ---
      let clientType = "Unknown";
      const clientStatus = presence?.clientStatus;
      if (clientStatus && Object.keys(clientStatus).length > 0) {
        const map = {
          desktop: "🖥️ Desktop",
          mobile: "📱 Mobile",
          web: "🌐 Web",
        };
        clientType = Object.keys(clientStatus)
          .map(k => map[k] || k)
          .join(", ");
      } else if (rawStatus === "offline" || rawStatus === "invisible") {
        clientType = "⚫ Offline";
      } else {
        clientType = "🟢 Active";
      }

      // --- VISUALS ---
      const avatarURL = fetchedUser.displayAvatarURL({ size: 1024, dynamic: true });
      const bannerURL = fetchedUser.bannerURL({ size: 2048, dynamic: true });
      const accentColor = fetchedUser.hexAccentColor || null;
      const hasAnimated = fetchedUser.avatar?.startsWith("a_");
      const hasNitro = hasAnimated || bannerURL || accentColor;
      if (hasNitro && accentColor) embedColor = accentColor;

      // --- TIME ---
      const createdTs = Math.floor(fetchedUser.createdTimestamp / 1000);
      const created = `<t:${createdTs}:D> (<t:${createdTs}:R>)`;
      let joined = "Unknown";
      if (member?.joinedTimestamp) {
        const jTs = Math.floor(member.joinedTimestamp / 1000);
        joined = `<t:${jTs}:D> (<t:${jTs}:R>)`;
      }

      // --- ROLES ---
      const roles =
        member?.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.toString())
          .slice(0, 10)
          .join(", ") || "None";
      const topRole = member?.roles.highest?.toString() || "None";
      const boosting = member?.premiumSince ? "✅ Yes" : "❌ No";

      // --- JOIN POSITION ---
      let joinPosition = "Unknown";
      try {
        const members = await interaction.guild.members.fetch();
        const sorted = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
        joinPosition = `#${sorted.map(m => m.id).indexOf(member.id) + 1} / ${members.size}`;
      } catch {}

      const footerText =
        interaction.user.id === "582502664252686356"
          ? `🧠 Developer Mode • ${interaction.client.user.username}`
          : hasNitro
          ? `Nitro User • Requested by ${interaction.user.tag}`
          : `Requested by ${interaction.user.tag}`;

      // --- EMBED ---
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${fetchedUser.tag} | Profile Summary`,
          iconURL: avatarURL,
        })
        .setColor(embedColor)
        .setThumbnail(avatarURL)
        .setDescription(`${userMention(fetchedUser.id)}’s profile overview`)
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
        .setFooter({ text: footerText })
        .setTimestamp();

      if (bannerURL) embed.setImage(bannerURL);

      // ✅ 2. Guaranteed reply (won’t throw even on expired interactions)
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] }).catch(console.error);
      } else {
        await interaction.reply({ embeds: [embed] }).catch(console.error);
      }
    } catch (err) {
      console.error("[userinfo] Fatal error:", err);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "❌ Failed to load user info.",
          });
        } else {
          await interaction.reply({
            content: "❌ Failed to load user info.",
            ephemeral: true,
          });
        }
      } catch {}
    }
  },
};
