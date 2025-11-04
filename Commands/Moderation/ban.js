const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  userMention,
} = require("discord.js");
const ModLogs = require("../../Schemas/modLogs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the guild by mention or user ID")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt.setName("target")
        .setDescription("The member to ban")
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName("userid")
        .setDescription("User ID to ban")
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason for banning")
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }); // keep interaction alive

    const targetUser = interaction.options.getUser("target");
    const userIdInput = interaction.options.getString("userid");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!targetUser && !userIdInput) {
      return interaction.editReply({ content: "❌ Please specify a user mention or a user ID to ban." });
    }

    let userToBan = targetUser;
    let memberToBan = null;
    const moderatorMember = interaction.guild.members.cache.get(interaction.user.id);

    if (userToBan) {
      memberToBan = interaction.guild.members.cache.get(userToBan.id);

      if (!memberToBan) {
        return interaction.editReply({ content: "❌ User not found in this guild." });
      }

      if (
        memberToBan.roles.highest.position >= moderatorMember.roles.highest.position &&
        interaction.user.id !== interaction.guild.ownerId
      ) {
        return interaction.editReply({ content: "❌ You cannot ban a member with an equal or higher role than yours." });
      }

      if (!memberToBan.bannable) {
        return interaction.editReply({ content: "❌ I cannot ban this member." });
      }
    } else {
      if (!/^\d{17,19}$/.test(userIdInput)) {
        return interaction.editReply({ content: "❌ Invalid user ID format." });
      }
    }

    // Try to DM the user
    let fetchedUserTag = null;
    try {
      if (!userToBan) {
        userToBan = await interaction.client.users.fetch(userIdInput);
      }
      fetchedUserTag = userToBan.tag;

      const dmEmbed = new EmbedBuilder()
        .setTitle(`You have been banned from ${interaction.guild.name}`)
        .setDescription(`Reason: ${reason}`)
        .setColor("DarkRed")
        .setTimestamp();

      await userToBan.send({ embeds: [dmEmbed] }).catch(() => {
        console.log(`[BAN] Could not DM ${userToBan.tag}`);
      });
    } catch {
      fetchedUserTag = `Unknown User (${userIdInput})`;
    }

    // Perform ban
    try {
      if (memberToBan) {
        await memberToBan.ban({ reason });
      } else {
        await interaction.guild.bans.create(userIdInput, { reason });
      }

      const replyEmbed = new EmbedBuilder()
        .setTitle("✅ Member Banned")
        .setDescription(`**User:** ${fetchedUserTag}\n**Reason:** ${reason}`)
        .setColor("Red")
        .setTimestamp();

      await interaction.editReply({ embeds: [replyEmbed] });

      console.log(`[BAN] ${fetchedUserTag} (${targetUser?.id || userIdInput}) banned from guild ${interaction.guild.name}. Reason: ${reason}`);

      // Mod log
      const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
      if (logData) {
        const logChannel = interaction.guild.channels.cache.get(logData.channelId);
        if (logChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle("⛔ Member Banned")
            .setColor("Red")
            .addFields(
              { name: "User", value: `${userMention(targetUser?.id || userIdInput)} (${fetchedUserTag})`, inline: true },
              { name: "Moderator", value: interaction.user.tag, inline: true },
              { name: "Reason", value: reason }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (err) {
      console.error(`[ERROR][BAN] Failed to ban:`, err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Failed to ban the member.", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Failed to ban the member.", ephemeral: true });
      }
    }
  }
};
