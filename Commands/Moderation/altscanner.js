const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Levenshtein distance
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j - 1],
          matrix[i][j - 1],
          matrix[i - 1][j]
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("altscanner")
    .setDescription("Scans for possible alt accounts of the selected user.")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to scan")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser("user");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);
    if (!targetMember) {
      return interaction.reply({ content: "❌ User not found in this server.", ephemeral: true });
    }

    await interaction.deferReply();

    const targetCreated = targetUser.createdTimestamp;
    const targetUsername = targetUser.username;
    const targetNickname = targetMember.nickname || "";
    const targetAvatarHash = targetUser.avatar;

    const suspiciousAlts = [];

    for (const [id, member] of interaction.guild.members.cache) {
      if (id === targetUser.id) continue;

      const user = member.user;
      let score = 0;
      const reasons = [];

      // Skip accounts much older (reduces false positives)
      if (user.createdTimestamp < targetCreated - 1000 * 60 * 60 * 24 * 45) continue;

      const createdDiff = Math.abs(user.createdTimestamp - targetCreated);

      // ---- ACCOUNT CREATION TIME ----
      if (createdDiff < 1000 * 60 * 60 * 24 * 1) {
        score += 3;
        reasons.push("Very close creation time (<24h)");
      } else if (createdDiff < 1000 * 60 * 60 * 24 * 3) {
        score += 2;
        reasons.push("Close creation time (<3 days)");
      } else if (createdDiff < 1000 * 60 * 60 * 24 * 7) {
        score += 1;
        reasons.push("Similar creation period (<7 days)");
      }

      // Username similarity (ignore very short names)
      if (targetUsername.length > 3 && user.username.length > 3) {
        const sim = stringSimilarity(user.username, targetUsername);
        if (sim > 0.85) {
          score += 3;
          reasons.push(`Highly similar username (${Math.round(sim * 100)}%)`);
        } else if (sim > 0.7) {
          score += 2;
          reasons.push(`Similar username (${Math.round(sim * 100)}%)`);
        }
      }

      // Nickname similarity
      if (targetNickname.length > 3 && (member.nickname || "").length > 3) {
        const nickSim = stringSimilarity(member.nickname || "", targetNickname);
        if (nickSim > 0.7) {
          score += 2;
          reasons.push(`Similar nickname (${Math.round(nickSim * 100)}%)`);
        }
      }

      // Avatar match
      if (user.avatar && user.avatar === targetAvatarHash) {
        score += 3;
        reasons.push("Same avatar");
      }

      // Suspicious pattern
      const suspiciousPatterns = /(alt|test|fake|bot|backup|acc|account|clone|copy|throwaway|temp|new|second|\d{4,})/i;
      if (suspiciousPatterns.test(user.username)) {
        score += 2;
        reasons.push("Suspicious username pattern");
      }

      // Only log strong matches
      if (score >= 5) {
        suspiciousAlts.push({
          tag: user.tag ?? user.username,
          id: user.id,
          createdAt: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          score,
          reasons: reasons.join(", ")
        });
      }
    }

    suspiciousAlts.sort((a, b) => b.score - a.score);

    const MAX_RESULTS = 20;
    const limited = suspiciousAlts.slice(0, MAX_RESULTS);

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Alt Scanner Results for ${targetUser.tag}`)
      .setColor(limited.length ? 0xff0000 : 0x00cc66)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Scanned ${interaction.guild.memberCount} members.` })
      .setTimestamp();

    if (limited.length) {
      embed.setDescription(
        limited.map(alt =>
          `> 👤 <@${alt.id}> (**${alt.tag}**)\n` +
          `> ⏱ Created: ${alt.createdAt}\n` +
          `> ⚠ Score: **${alt.score}** — ${alt.reasons}`
        ).join("\n\n") +
        (suspiciousAlts.length > MAX_RESULTS
          ? `\n\n… and **${suspiciousAlts.length - MAX_RESULTS} more** not shown.`
          : "")
      );
    } else {
      embed.setDescription("✅ No likely alt accounts found.");
    }

    return interaction.editReply({ embeds: [embed] });
  }
};
