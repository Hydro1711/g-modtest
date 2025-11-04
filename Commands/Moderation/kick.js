const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  userMention,
} = require("discord.js");
const ModLogs = require("../../Schemas/modLogs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option.setName("target")
        .setDescription("The member you want to kick.")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the kick.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: "❌ Member not found in this server.", ephemeral: true });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({ content: "❌ You can't kick yourself.", ephemeral: true });
    }

    if (member.id === interaction.client.user.id) {
      return interaction.reply({ content: "❌ You can't kick me, nice try.", ephemeral: true });
    }

    if (!member.kickable) {
      return interaction.reply({ content: "❌ I cannot kick this member. They may have a higher role or I'm missing permissions.", ephemeral: true });
    }

    const dmEmbed = new EmbedBuilder()
      .setTitle(`You have been kicked from ${interaction.guild.name}`)
      .setColor("Red")
      .addFields(
        { name: "Moderator", value: interaction.user.tag },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    let dmFailed = false;
    try {
      await targetUser.send({ embeds: [dmEmbed] });
    } catch {
      dmFailed = true;
    }

    try {
      await member.kick(reason);
    } catch (err) {
      console.error(`[ERROR] Failed to kick member:`, err);
      return interaction.reply({ content: "❌ Failed to kick the member.", ephemeral: true });
    }

    const replyEmbed = new EmbedBuilder()
      .setTitle("👢 Member Kicked")
      .setColor("Orange")
      .addFields(
        { name: "User", value: `${userMention(member.id)} (${targetUser.tag})` },
        { name: "Moderator", value: interaction.user.tag },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [replyEmbed] });

    if (dmFailed) {
      const warnEmbed = new EmbedBuilder()
        .setDescription(`⚠️ Could not DM ${userMention(member.id)}.`)
        .setColor("Orange");
      await interaction.followUp({ embeds: [warnEmbed], ephemeral: true });
    }

    // Mod log
    const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
    if (logData) {
      const logChannel = interaction.guild.channels.cache.get(logData.channelId);
      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("👢 Member Kicked")
          .setColor("Orange")
          .addFields(
            { name: "User", value: `${userMention(member.id)} (${targetUser.tag})`, inline: true },
            { name: "Moderator", value: interaction.user.tag, inline: true },
            { name: "Reason", value: reason }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};
