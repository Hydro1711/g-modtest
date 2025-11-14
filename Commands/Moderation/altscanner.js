const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const stringSimilarity = require('string-similarity');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('altscanner')
    .setDescription('Scan a user for potential alt accounts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to scan for potential alts')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName('threshold')
        .setDescription('Similarity threshold (0.0-1.0, default 0.5)')
        .setMinValue(0.1)
        .setMaxValue(1.0)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getMember('user');
      const threshold = interaction.options.getNumber('threshold') || 0.5;
      const guild = interaction.guild;

      if (!targetUser) {
        return interaction.editReply({ content: '❌ Could not find that user in this server.' });
      }

      if (targetUser.user.bot) {
        return interaction.editReply({ content: '❌ Cannot scan bot accounts.' });
      }

      await guild.members.fetch();
      const members = Array.from(guild.members.cache.values());

      const potentialAlts = [];

      const targetUsername = targetUser.user.username.toLowerCase();
      const targetDisplayName = (targetUser.nickname || targetUser.user.displayName || targetUser.user.username).toLowerCase();
      const targetCreatedAt = targetUser.user.createdTimestamp;
      const targetJoinedAt = targetUser.joinedTimestamp;

      for (const member of members) {
        if (member.id === targetUser.id || member.user.bot) continue;

        const username = member.user.username.toLowerCase();
        const displayName =
          (member.nickname || member.user.displayName || member.user.username).toLowerCase();

        const unameSim = stringSimilarity.compareTwoStrings(targetUsername, username);
        const dnameSim = stringSimilarity.compareTwoStrings(targetDisplayName, displayName);
        const cross1 = stringSimilarity.compareTwoStrings(targetUsername, displayName);
        const cross2 = stringSimilarity.compareTwoStrings(targetDisplayName, username);

        const maxSimilarity = Math.max(unameSim, dnameSim, cross1, cross2);

        if (maxSimilarity >= threshold) {
          const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
          const accountAgeDiff = Math.abs(Math.floor((targetCreatedAt - member.user.createdTimestamp) / 86400000));
          const joinDateDiff = Math.abs(Math.floor((targetJoinedAt - member.joinedTimestamp) / 86400000));

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
            flags: { sameDayCreated, sameDayJoined, createdWithinWeek, joinedWithinWeek }
          });
        }
      }

      if (potentialAlts.length === 0) {
        return interaction.editReply({
          content: `✅ No potential alt accounts found for **${targetUser.user.tag}** with ${(threshold * 100).toFixed(0)}% similarity threshold.`
        });
      }

      potentialAlts.sort((a, b) => b.suspicionScore - a.suspicionScore);

      const maxPerPage = 5;
      const pages = [];
      const totalPages = Math.ceil(potentialAlts.length / maxPerPage);

      function generatePage(pageIndex) {
        const start = pageIndex * maxPerPage;
        const batch = potentialAlts.slice(start, start + maxPerPage);

        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🔍 Alt Account Scanner Results')
          .setDescription(
            `Scanning **${targetUser.user.tag}**\n` +
            `Found **${potentialAlts.length}** potential alt account(s)\n` +
            `Threshold: ${(threshold * 100).toFixed(0)}%`
          )
          .setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setFooter({
            text: `Page ${pageIndex + 1}/${totalPages} | Scanned ${members.length} members`
          });

        batch.forEach((alt, idx) => {
          const index = start + idx + 1;
          const flags = alt.flags;

          const warningFlags = [];
          if (flags.sameDayCreated) warningFlags.push('🔴 Same day created');
          if (flags.sameDayJoined) warningFlags.push('🔴 Same day joined');
          if (flags.createdWithinWeek && !flags.sameDayCreated) warningFlags.push('🟡 Created within 7 days');
          if (flags.joinedWithinWeek && !flags.sameDayJoined) warningFlags.push('🟡 Joined within 7 days');

          const suspicionEmoji =
            alt.suspicionScore >= 80 ? '🔴' :
            alt.suspicionScore >= 60 ? '🟠' :
            '🟡';

          embed.addFields({
            name: `${suspicionEmoji} Match #${index} — ${alt.suspicionScore.toFixed(0)}% Suspicion`,
            value: [
              `**Username:** ${alt.member.user.tag}`,
              `**Display Name:** ${alt.member.displayName}`,
              `**Name Similarity:** ${(alt.nameSimilarity * 100).toFixed(1)}%`,
              `**Suspicion Score:** ${alt.suspicionScore.toFixed(1)}%`,
              `**Account Age:** ${alt.accountAge} days`,
              `**Created:** <t:${Math.floor(alt.member.user.createdTimestamp / 1000)}:D> (${alt.accountAgeDiff}d diff)`,
              `**Joined Server:** <t:${Math.floor(alt.member.joinedTimestamp / 1000)}:D> (${alt.joinDateDiff}d diff)`,
              warningFlags.length ? `\n${warningFlags.join('\n')}` : ''
            ].join('\n')
          });
        });

        if (pageIndex === 0) {
          embed.addFields({
            name: '📋 Target Information',
            value: [
              `**Target User:** ${targetUser.user.tag}`,
              `**Target Account Age:** ${Math.floor((Date.now() - targetCreatedAt) / 86400000)} days`,
              `**Target Created:** <t:${Math.floor(targetCreatedAt / 1000)}:D>`,
              `**Target Joined:** <t:${Math.floor(targetJoinedAt / 1000)}:D>`
            ].join('\n'),
            inline: false
          });
        }

        return embed;
      }

      for (let i = 0; i < totalPages; i++) {
        pages.push(generatePage(i));
      }

      if (pages.length === 1) {
        return interaction.editReply({ embeds: pages });
      }

      let currentPage = 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Secondary)
      );

      const response = await interaction.editReply({
        embeds: [pages[currentPage]],
        components: [row]
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 1000 * 60 * 3
      });

      collector.on('collect', (btn) => {
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({ content: '❌ These buttons are not for you.', ephemeral: true });
        }

        if (btn.customId === 'prev') {
          currentPage = (currentPage - 1 + totalPages) % totalPages;
        } else if (btn.customId === 'next') {
          currentPage = (currentPage + 1) % totalPages;
        }

        btn.update({
          embeds: [pages[currentPage]],
          components: [row]
        });
      });

      collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
      });

    } catch (err) {
      console.error(err);
      interaction.editReply({ content: '❌ An error occurred while scanning for alt accounts.' });
    }
  }
};
