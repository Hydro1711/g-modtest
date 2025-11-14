const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// -----------------------------
// Levenshtein Distance Function
// -----------------------------
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j - 1], // substitution
          matrix[i][j - 1],     // insertion
          matrix[i - 1][j]      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// -----------------------------
// String Similarity (0–1 ratio)
// -----------------------------
function stringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();

  const distance = levenshtein(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);

  return 1 - distance / maxLen;
}

// -----------------------------
// Slash Command Definition
// -----------------------------
module.exports = {
  data: new SlashCommandBuilder()
    .setName("altscanner")
    .setDescription("Scans for possible alt accounts of the selected user in this server.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to scan for alt accounts")
        .setRequired(true)
    ),

  // -----------------------------
  // Main Execution Handler
  // -----------------------------
  async execute(interaction) {
    // Permission check
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    // Fetch target user
    const targetUser = interaction.options.getUser("user");
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    if (!targetMember) {
      return interaction.reply({
        content: "User not found in this server.",
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // Target user data
    const targetCreated = targetUser.createdTimestamp;
    const targetUsername = targetUser.username;
    const targetNickname = targetMember.nickname || "";
    const targetAvatarHash = targetUser.avatar;

    const suspiciousAlts = [];

    // -----------------------------
    // Scan all members
    // -----------------------------
    interaction.guild.members.cache.forEach(member => {
      if (member.id === targetUser.id) return;

      const user = member.user;
      const createdAt = user.createdTimestamp;
      const creationDiff = Math.abs(createdAt - targetCreated);

      const usernameSim = stringSimilarity(user.username, targetUsername);
      const nicknameSim = stringSimilarity(member.nickname || "", targetNickname);
      const avatarMatch = user.avatar && user.avatar === targetAvatarHash;

      const suspiciousPatterns = /(alt|test|fake|bot|backup|\d{4,})/i;
      const nameSuspicious = suspiciousPatterns.test(user.username);

      let score = 0;
      const reasons = [];

      // Account creation date check
      if (creationDiff < 1000 * 60 * 60 * 24) {
        score += 3;
        reasons.push("Close account creation date");
      }

      // Username similarity
      if (usernameSim > 0.7) {
        score += 2;
        reasons.push(`Similar username (${Math.round(usernameSim * 100)}%)`);
      }

      // Nickname similarity
      if (nicknameSim > 0.7) {
        score += 2;
        reasons.push(`Similar nickname (${Math.round(nicknameSim * 100)}%)`);
      }

      // Avatar match
      if (avatarMatch) {
        score += 3;
        reasons.push("Same avatar");
      }

      // Suspicious name pattern
      if (nameSuspicious) {
        score += 2;
        reasons.push("Suspicious name pattern");
      }

      // If score passes threshold, flag as suspected alt
      if (score >= 3) {
        suspiciousAlts.push({
          tag: user.tag,
          id: user.id,
          createdAt: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          score,
          reasons: reasons.join(", ")
        });
      }
    });

    // Sort by suspicion level
    suspiciousAlts.sort((a, b) => b.score - a.score);

    // -----------------------------
    // Build embed
    // -----------------------------
    const embed = new EmbedBuilder()
      .setTitle(`Alt Scanner Results for ${targetUser.tag}`)
      .setColor(suspiciousAlts.length ? "#ff0000" : "#00cc66")
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(
        suspiciousAlts.length
          ? suspiciousAlts
              .map(alt =>
                `• <@${alt.id}> — ${alt.tag}\n` +
                `   ⏱ ${alt.createdAt}\n` +
                `   ⚠️ Score: **${alt.score}** (${alt.reasons})`
              )
              .join("\n\n")
          : "✅ No possible alt accounts detected."
      )
      .setFooter({ text: `Scanned ${interaction.guild.memberCount} members.` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
