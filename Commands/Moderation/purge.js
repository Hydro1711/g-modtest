const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const modLogs = require('../../Schemas/modLogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete messages from a user in the last 24 hours across all server channels.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to purge messages from')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('identifier')
        .setDescription('User ID, username, or tag if you didn’t use the selector')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for purging messages')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply();

    const userOption = interaction.options.getUser('target');
    const identifier = interaction.options.getString('identifier');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guild = interaction.guild;

    let target = userOption;

    if (!target && identifier) {
      try {
        target = await guild.members.fetch(identifier).then(m => m.user).catch(() => null);
        if (!target) {
          const members = await guild.members.fetch();
          target = members.find(m =>
            m.user.username.toLowerCase() === identifier.toLowerCase() ||
            m.user.tag.toLowerCase() === identifier.toLowerCase()
          )?.user;
        }
      } catch (err) {
        console.error('[Purge] Error resolving identifier:', err);
      }
    }

    if (!target) {
      return interaction.editReply({ content: '❌ Could not find a user by that ID, username, or tag.' });
    }

    // Get all deletable text channels
    const textChannels = guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildText &&
      c.viewable &&
      c.permissionsFor(guild.members.me).has([PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages])
    );

    const sortedChannelNames = [...textChannels.values()].map(c => `#${c.name}`);

    // Spinner + staged progress bar setup
    const spinner = ['\\', '-', '/', '|'];
    let spinnerIndex = 0;
    let progress = 0;
    let stepIndex = 0;

    const getBar = (progress, step) => {
      const blocks = Math.floor(progress / 10);
      const bar = '▉'.repeat(blocks) + '-'.repeat(10 - blocks);
      return `${spinner[spinnerIndex]} [${bar}] ${progress}% ${step}`;
    };

    const progressMessage = await interaction.followUp({
      content: `\`${getBar(progress, 'Starting purge...')}\``,
      fetchReply: true
    });

    // Fake animation task
    const fakeSteps = ['Searching messages...', 'Checking permissions...'];
    for (const name of sortedChannelNames.slice(0, 5)) {
      fakeSteps.push(`Deleting from ${name}...`);
    }
    fakeSteps.push('Finalizing...');
    fakeSteps.push('Done!');

    const interval = setInterval(() => {
      if (progress >= 100) {
        clearInterval(interval);
        return;
      }

      progress += 5;
      spinnerIndex = (spinnerIndex + 1) % spinner.length;
      if (progress % 15 === 0 && stepIndex < fakeSteps.length - 1) stepIndex++;

      progressMessage.edit({
        content: `\`${getBar(progress > 100 ? 100 : progress, fakeSteps[stepIndex])}\``
      }).catch(() => {});
    }, 1000); // 1s intervals

    // Real purge logic starts
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let totalDeleted = 0;
    let totalFound = 0;

    try {
      for (const channel of textChannels.values()) {
        try {
          const messages = await channel.messages.fetch({ limit: 100 });
          const toDelete = messages.filter(msg =>
            msg.author.id === target.id &&
            msg.createdTimestamp >= cutoff
          );

          if (toDelete.size > 0) {
            totalFound += toDelete.size;
            const batches = Array.from(toDelete.values());
            while (batches.length > 0) {
              const batch = batches.splice(0, 100);
              await channel.bulkDelete(batch, true)
                .then(() => totalDeleted += batch.length)
                .catch(err => console.error(`[Purge] Error in #${channel.name}:`, err));
              await new Promise(res => setTimeout(res, 1000));
            }
          }
        } catch (channelError) {
          console.error(`[Purge] Error processing #${channel.name}:`, channelError);
        }
      }

      // Wait for fake progress animation to finish (~22s)
      await new Promise(res => setTimeout(res, 22000));

      if (totalFound === 0) {
        await progressMessage.edit({ content: `\`No messages found from ${target.tag} in the last 24h.\`` });
      } else {
        await progressMessage.edit({ content: `\`✅ Deleted ${totalDeleted} messages from ${target.tag} across the server.\`` });
      }

      setTimeout(() => {
        progressMessage?.delete().catch(() => {});
      }, 5000);

      // Log to mod log channel
      try {
        const data = await modLogs.findOne({ guildId: guild.id });
        if (data?.channelId) {
          const logChannel = guild.channels.cache.get(data.channelId);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle('<:trashIcon:1395102346173743274> Purge Action')
              .setColor(0xff0000)
              .addFields(
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Target', value: `${target.tag}`, inline: true },
                { name: 'Deleted Messages', value: `${totalDeleted}`, inline: true },
                { name: 'Reason', value: reason, inline: false }
              )
              .setTimestamp();

            await logChannel.send({ embeds: [embed] });
          }
        }
      } catch (logError) {
        console.error('[Purge] Error logging to mod log channel:', logError);
      }

      // Save to ModInteraction DB
      try {
        await ModInteraction.create({
          guildId: guild.id,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          action: 'purge',
          targetId: target.id,
          targetTag: target.tag,
          reason,
          details: `Deleted ${totalDeleted} messages in last 24 hours`
        });
      } catch (dbError) {
        console.error('[Purge] Error saving mod interaction:', dbError);
      }

    } catch (error) {
      console.error('[Purge] Fatal error:', error);
      clearInterval(interval);
      try {
        await progressMessage?.edit({ content: '`❌ An error occurred during purge.`' });
      } catch (e) {
        console.warn('[Purge] Could not update error message.');
      }
    }
  },
};
