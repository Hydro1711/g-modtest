const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  userMention,
} = require("discord.js");
const Warns = require("../../Schemas/warns");
const ModLogs = require("../../Schemas/modLogs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn system commands")
    .addSubcommand(sub =>
      sub
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(o =>
          o.setName("member").setDescription("Member to warn").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("reason").setDescription("Reason for the warning").setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("warnings")
        .setDescription("List all warnings for a member.")
        .addUserOption(o =>
          o.setName("member").setDescription("User to view warnings for").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("clearwarns")
        .setDescription("Clear all warnings for a member.")
        .addUserOption(o =>
          o.setName("member").setDescription("User to clear warnings for").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "warn") {
      await interaction.deferReply();

      const member = interaction.options.getMember("member");
      const reason = interaction.options.getString("reason") || "No reason provided";
      const moderator = interaction.member;

      if (!member) return interaction.editReply("❌ Could not find that member.");
      if (member.id === moderator.id) return interaction.editReply("❌ You can't warn yourself.");
      if (member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.editReply("❌ You cannot warn an administrator.");

      await Warns.create({
        guildId: interaction.guild.id,
        userId: member.id,
        modId: moderator.id,
        reason,
        timestamp: Date.now(),
      });

      let dmStatus = "✅ User has been DMed.";
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("⚠️ You’ve been warned")
          .setDescription(`You received a warning in **${interaction.guild.name}**.`)
          .addFields({ name: "Reason", value: reason })
          .setColor("Orange")
          .setFooter({ text: `Issued by ${moderator.user.tag}`, iconURL: moderator.displayAvatarURL() });
        await member.send({ embeds: [dmEmbed] });
      } catch {
        dmStatus = "⚠️ Could not DM user (DMs disabled).";
      }

      const allWarns = await Warns.find({ guildId: interaction.guild.id, userId: member.id });
      const warnCount = allWarns.length;

      const replyEmbed = new EmbedBuilder()
        .setTitle("User Warned")
        .setDescription(`${member} has been warned.`)
        .addFields({ name: "Reason", value: reason })
        .setColor("Orange")
        .setFooter({ text: `${dmStatus} | Total warnings: ${warnCount}` });

      await interaction.editReply({ embeds: [replyEmbed] });

      const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
      const logChannel = logData ? interaction.guild.channels.cache.get(logData.channelId) : null;
      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("⚠️ User Warned")
          .setColor("Orange")
          .addFields(
            { name: "User", value: `${userMention(member.id)} (${member.user.tag})`, inline: false },
            { name: "Moderator", value: moderator.user.tag, inline: false },
            { name: "Reason", value: reason, inline: false }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }

      try {
        let actionReason = null;
        let color = "Red";
        let actionText = null;
        let dmMessage = null;

        if (warnCount === 3) {
          await member.timeout(24 * 60 * 60 * 1000, "3 Warns. Auto Mute");
          actionReason = "3 Warns. Auto Mute";
          color = "Red";
          actionText = `${member} reached **3 warnings** and was automatically **muted for 24 hours**.`;
          dmMessage = `You have been automatically muted for 24 hours in **${interaction.guild.name}** for reaching 3 warnings.`;
        } else if (warnCount === 5) {
          await member.kick("5 Warns. Auto Kick");
          actionReason = "5 Warns. Auto Kick";
          color = "Orange";
          actionText = `${member} reached **5 warnings** and was automatically **kicked**.`;
          dmMessage = `You have been automatically kicked from **${interaction.guild.name}** for reaching 5 warnings.`;
        } else if (warnCount >= 7) {
          await member.ban({ reason: "7 Warns. Auto Ban" });
          actionReason = "7 Warns. Auto Ban";
          color = "DarkRed";
          actionText = `${member} reached **7 warnings** and was automatically **banned**.`;
          dmMessage = `You have been automatically banned from **${interaction.guild.name}** for reaching 7 warnings.`;
        }

        if (actionReason) {
          try {
            await member.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("⚠️ Automatic Moderation")
                  .setDescription(dmMessage)
                  .setColor(color),
              ],
            });
          } catch {}

          const autoEmbed = new EmbedBuilder()
            .setTitle("⚠️ Automatic Moderation Triggered")
            .setDescription(actionText)
            .setColor(color)
            .setFooter({ text: `Reason: ${actionReason}` });

          await interaction.followUp({ embeds: [autoEmbed] });

          if (logChannel?.isTextBased()) {
            const autoLog = new EmbedBuilder()
              .setTitle("🚨 Auto Moderation Triggered")
              .setColor(color)
              .addFields(
                { name: "User", value: `${member.user.tag} (${member.id})`, inline: false },
                { name: "Action", value: actionReason, inline: false }
              )
              .setTimestamp();
            await logChannel.send({ embeds: [autoLog] });
          }
        }
      } catch (err) {
        console.error("Error in auto moderation:", err);
        await interaction.followUp({
          content: "⚠️ Error performing automatic moderation action.",
          ephemeral: true,
        });
      }
    }

    else if (sub === "warnings") {
      await interaction.deferReply();

      const member = interaction.options.getMember("member");
      if (!member) return interaction.editReply("❌ Member not found.");

      const warns = await Warns.find({ guildId: interaction.guild.id, userId: member.id });

      if (!warns.length)
        return interaction.editReply(`✅ ${member} has no warnings.`);

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Warnings for ${member.user.tag}`)
        .setColor("Orange");

      for (const [index, w] of warns.entries()) {
        embed.addFields({
          name: `#${index + 1} • Issued by <@${w.modId}>`,
          value: `💬 ${w.reason}\n🕒 <t:${Math.floor(w.timestamp / 1000)}:R>`,
          inline: false,
        });
      }

      embed.setFooter({ text: `Total warnings: ${warns.length}` });
      await interaction.editReply({ embeds: [embed] });
    }

    else if (sub === "clearwarns") {
      await interaction.deferReply();

      const member = interaction.options.getMember("member");
      if (!member) return interaction.editReply("❌ Member not found.");

      await Warns.deleteMany({ guildId: interaction.guild.id, userId: member.id });

      const embed = new EmbedBuilder()
        .setTitle("🧹 Warnings Cleared")
        .setDescription(`All warnings for ${member} have been cleared.`)
        .setColor("Green")
        .setFooter({
          text: `Cleared by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({ embeds: [embed] });

      const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
      const logChannel = logData ? interaction.guild.channels.cache.get(logData.channelId) : null;
      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🧹 Warnings Cleared")
          .setColor("Green")
          .addFields(
            { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Moderator", value: interaction.user.tag, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};
