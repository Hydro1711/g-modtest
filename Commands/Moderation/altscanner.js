const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

// --- Simple similarity using Levenshtein distance ---
function levenshtein(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase();
  b = b.toLowerCase();

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j - 1],
          matrix[i][j - 1],
          matrix[i - 1][j]
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 0 : 1 - distance / maxLen;
}

// mimic string-similarity API you were using
const stringSimilarity = {
  compareTwoStrings: (a, b) => levenshtein(a, b),
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('altscanner')
    .setDescription('Scan a user for potential alt accounts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to scan for potential alts')
        .setRequired(true),
    )
    .addNumberOption(option =>
      option
        .setName('threshold')
        .setDescription('Similarity threshold (0.0-1.0, default 0.5)')
        .setMinValue(0.1)
        .setMaxValue(1.0)
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getMember('user');
      const threshold = interaction.options.getNumber('threshold') || 0.5;
      const guild = interaction.guild;

      if (!targetUser) {
        return interaction.editReply({
          content: '❌ Could not find that user in this server.',
        });
      }

      if (targetUser.user.bot) {
        return interaction.editReply({
          content: '❌ Cannot scan bot accounts.',
        });
      }

      await guild.members.fetch();
      const members = Array.from(guild.members.cache.values());

      const potentialAlts = [];

      const targetUsername = targetUser.user.username.toLowerCase();
      const targetDisplayName = (
        targetUser.nickname ||
        targetUser.user.displayName ||
        targetUser.user.username
      ).toLowerCase();

      const targetCreatedAt = targetUser.user.createdTimestamp;
      const targetJoinedAt = targetUser.joinedTimestamp;

      for (const member of members) {
        if (member.id === targetUser.id || member.user.bot) continue;

        const username = member.user.username.toLowerCase();
        const displayName = (
          member.nickname ||
          member.user.displayName ||
          member.user.username
        ).toLowerCase();

        const usernameSimilarity = stringSimilarity.compareTwoStrings(targetUsername, username);
        const displayNameSimilarity = stringSimilarity.compareTwoStrings(targetDisplayName, displayName);
        const crossSimilarity1 = stringSimilarity.compareTwoStrings(targetUsername, displayName);
        const crossSimilarity2 = stringSimilarity.compareTwoStrings(targetDisplayName, username);

        const maxSimilarity = Math.max(
          usernameSimilarity,
          displayNameSimilarity,
          crossSimilarity1,
          crossSimilarity2,
        );

        if (maxSimilarity >= threshold) {
          const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

          const accountAgeDiff = Math.abs(
            Math.floor((targetCreatedAt - member.user.createdTimestamp) / 86400000),
          );

          const joinDateDiff = Math.abs(
            Math.floor((targetJoinedAt - member.joinedTimestamp) / 86400000),
          );

          const createdWithinWeek = accountAgeDiff <= 7;
          const joinedWithinWeek = joinDateDiff <= 7;
          const sameDayCreated = accountAgeDiff === 0;
          const sameDayJoined = joinDateDiff === 0;

          let suspicionScore = maxSimilarity * 100;
          if (sameDayCreated) suspicionScore += 15;
          else if (createdWithinWeek) suspicionScore += 10;
          if (sameDayJoined) suspicionScore += 15;
          else if (joinedWithinWeek) suspicionScore += 10;

          suspicionScore = Math.min(suspicionScore, 100);

          potentialAlts.push({
            member,
            accountAge,
            accountAgeDiff,
            joinDateDiff,
            nameSimilarity: maxSimilarity,
            suspicionScore,
            flags: {
              sameDayCreated,
              sameDayJoined,
              createdWithinWeek,
              joinedWithinWeek,
            },
          });
        }
      }

      if (potentialAlts.length === 0) {
        return interaction.editReply({
          content: `✅ No potential alt accounts found for **${targetUser.user.tag}** with ${(threshold * 100).toFixed(0)}% similarity threshold.`,
        });
      }

      potentialAlts.sort((a, b) => b.suspicionScore - a.suspicionScore);

      const maxPerPage = 5;
      const totalPages = Math.ceil(potentialAlts.length / maxPerPage);

      const targetAccountAge = Math.floor((Date.now() - targetCreatedAt) / 86400000);

      const makePageEmbed = (pageIndex) => {
        const start = pageIndex * maxPerPage;
        const batch = potentialAlts.slice(start, start + maxPerPage);

        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🔍 Alt Account Scanner Results')
          .setDescription(
            `Scanning **${targetUser.user.tag}**\n` +
            `Found **${potentialAlts.length}** potential alt account(s)\n` +
            `Threshold: ${(threshold * 100).toFixed(0)}%`,
          )
          .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({
            text: `Page ${pageIndex + 1}/${totalPages} | Scanned ${members.length} members`,
          });

        // Add matches
        batch.forEach((alt, index) => {
          const globalIndex = start + index + 1;
          const { member, accountAge, accountAgeDiff, joinDateDiff, nameSimilarity, suspicionScore, flags } = alt;

          const warningFlags = [];
          if (flags.sameDayCreated) warningFlags.push('🔴 Same day created');
          if (flags.sameDayJoined) warningFlags.push('🔴 Same day joined');
          if (flags.createdWithinWeek && !flags.sameDayCreated) warningFlags.push('🟡 Created within 7 days');
          if (flags.joinedWithinWeek && !flags.sameDayJoined) warningFlags.push('🟡 Joined within 7 days');

          const suspicionEmoji =
            suspicionScore >= 80 ? '🔴' :
            suspicionScore >= 60 ? '🟠' :
            '🟡';

          const fieldValue = [
            `**Username:** ${member.user.tag}`,
            `**Display Name:** ${member.displayName}`,
            `**Name Similarity:** ${(nameSimilarity * 100).toFixed(1)}%`,
            `**Suspicion Score:** ${suspicionScore.toFixed(1)}%`,
            `**Account Age:** ${accountAge} days`,
            `**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:D> (${accountAgeDiff}d difference)`,
            `**Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:D> (${joinDateDiff}d difference)`,
            warningFlags.length > 0 ? `\n${warningFlags.join('\n')}` : '',
          ].join('\n');

          embed.addFields({
            name: `${suspicionEmoji} Match #${globalIndex} - ${suspicionScore.toFixed(0)}% Suspicion`,
            value: fieldValue,
            inline: false,
          });
        });

        // Only on first page: target info
        if (pageIndex === 0) {
          embed.addFields({
            name: '📋 Target Information',
            value: [
              `**Target User:** ${targetUser.user.tag}`,
              `**Target Account Age:** ${targetAccountAge} days`,
              `**Target Created:** <t:${Math.floor(targetCreatedAt / 1000)}:D>`,
              `**Target Joined:** <t:${Math.floor(targetJoinedAt / 1000)}:D>`,
            ].join('\n'),
            inline: false,
          });
        }

        return embed;
      };

      // If only one page, no buttons needed
      if (totalPages === 1) {
        const embed = makePageEmbed(0);
        return interaction.editReply({ embeds: [embed] });
      }

      let currentPage = 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('altscanner_prev')
          .setLabel('◀️')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('altscanner_next')
          .setLabel('▶️')
          .setStyle(ButtonStyle.Secondary),
      );

      const message = await interaction.editReply({
        embeds: [makePageEmbed(currentPage)],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 1000 * 60 * 3, // 3 minutes
      });

      collector.on('collect', async (btn) => {
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({ content: '❌ These buttons are not for you.', ephemeral: true });
        }

        if (btn.customId === 'altscanner_prev') {
          currentPage = (currentPage - 1 + totalPages) % totalPages;
        } else if (btn.customId === 'altscanner_next') {
          currentPage = (currentPage + 1) % totalPages;
        }

        await btn.update({
          embeds: [makePageEmbed(currentPage)],
          components: [row],
        });
      });

      collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      console.error('Error in altScanner command:', error);

      // avoid "already acknowledged" error
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: '❌ An error occurred while scanning for alt accounts. Please try again.',
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '❌ An error occurred while scanning for alt accounts. Please try again.',
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
