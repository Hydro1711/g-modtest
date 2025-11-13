const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  userMention,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
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
          o.setName("reason").setDescription("Reason for the warning")
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
        .setName("delwarn")
        .setDescription("Delete a warning by case ID.")
        .addStringOption(o =>
          o.setName("caseid").setDescription("Case ID to delete").setRequired(true)
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

    // -----------------------------------------------------------
    // ------------------------- WARN -----------------------------
    // -----------------------------------------------------------

    if (sub === "warn") {
      await interaction.deferReply();

      const member = interaction.options.getMember("member");
      const reason = interaction.options.getString("reason") || "No reason provided";
      const moderator = interaction.member;

      if (!member) return interaction.editReply("❌ Could not find that member.");
      if (member.id === moderator.id)
        return interaction.editReply("❌ You can't warn yourself.");
      if (member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.editReply("❌ You cannot warn an administrator.");

      // Generate case ID
      const caseId = Math.random().toString(36).substring(2, 8).toUpperCase();

      await Warns.create({
        guildId: interaction.guild.id,
        userId: member.id,
        modId: moderator.id,
        reason,
        timestamp: Date.now(),
        caseId
      });

      let dmStatus = "✅ User has been DMed.";
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("⚠️ You’ve been warned")
          .setDescription(`You received a warning in **${interaction.guild.name}**.`)
          .addFields({ name: "Reason", value: reason })
          .addFields({ name: "Case ID", value: caseId })
          .setColor("Orange");
        await member.send({ embeds: [dmEmbed] });
      } catch {
        dmStatus = "⚠️ Could not DM user (DMs disabled).";
      }

      const allWarns = await Warns.find({ guildId: interaction.guild.id, userId: member.id });
      const warnCount = allWarns.length;

      const replyEmbed = new EmbedBuilder()
        .setTitle("User Warned")
        .setDescription(`${member} has been warned.`)
        .addFields(
          { name: "Reason", value: reason },
          { name: "Case ID", value: caseId }
        )
        .setColor("Orange")
        .setFooter({ text: `${dmStatus} | Total warnings: ${warnCount}` });

      await interaction.editReply({ embeds: [replyEmbed] });

      // MOD LOGS
      const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
      const logChannel = logData ? interaction.guild.channels.cache.get(logData.channelId) : null;

      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("⚠️ User Warned")
          .setColor("Orange")
          .addFields(
            { name: "User", value: `${userMention(member.id)} (${member.user.tag})` },
            { name: "Moderator", value: `${userMention(moderator.id)} (${moderator.user.tag})` },
            { name: "Reason", value: reason },
            { name: "Case ID", value: caseId }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    // -----------------------------------------------------------
    // ----------------------- WARNINGS --------------------------
    // -----------------------------------------------------------

    else if (sub === "warnings") {
      await interaction.deferReply();

      const member = interaction.options.getMember("member");
      if (!member) return interaction.editReply("❌ Member not found.");

      const warns = await Warns.find({ guildId: interaction.guild.id, userId: member.id });

      if (!warns.length) {
        return interaction.editReply(`✅ ${member} has no warnings.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Warnings for ${member.user.tag}`)
        .setColor("Orange");

      for (const w of warns) {
        let modUser;
        try {
          modUser = await interaction.client.users.fetch(w.modId);
        } catch {
          modUser = { tag: "Unknown", id: w.modId };
        }

        embed.addFields({
          name: `Case ${w.caseId}`,
          value: `👮 Issued by ${userMention(w.modId)} (${modUser.tag})\n💬 ${w.reason}\n🕒 <t:${Math.floor(
            w.timestamp / 1000
          )}:R>`,
          inline: false
        });
      }

      embed.setFooter({ text: `Total warnings: ${warns.length}` });

      await interaction.editReply({ embeds: [embed] });
    }

    // -----------------------------------------------------------
    // ---------------------- DELETE WARN ------------------------
    // -----------------------------------------------------------

    else if (sub === "delwarn") {
      await interaction.deferReply({ ephemeral: true });

      const caseId = interaction.options.getString("caseid").toUpperCase();
      const warn = await Warns.findOne({ guildId: interaction.guild.id, caseId });

      if (!warn)
        return interaction.editReply(`❌ No warning found with case ID **${caseId}**.`);

      const user = await interaction.client.users.fetch(warn.userId).catch(() => null);

      // Confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_del")
          .setLabel("Delete Warning")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel_del")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({
        content: `Are you sure you want to delete warning **${caseId}**?`,
        components: [row]
      });

      const msg = await interaction.fetchReply();

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15000
      });

      collector.on("collect", async i => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: "This confirmation isn't for you.", ephemeral: true });

        if (i.customId === "cancel_del") {
          await i.update({ content: "❌ Cancelled.", components: [] });
          return collector.stop();
        }

        if (i.customId === "confirm_del") {
          await Warns.deleteOne({ _id: warn._id });

          const embed = new EmbedBuilder()
            .setTitle("🗑️ Warning Deleted")
            .setColor("Green")
            .addFields(
              { name: "Case ID", value: caseId },
              { name: "User", value: user ? `${user.tag} (${user.id})` : warn.userId },
              { name: "Moderator", value: interaction.user.tag }
            )
            .setTimestamp();

          await i.update({ content: "", embeds: [embed], components: [] });

          // Log to mod logs
          const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
          const logChannel = logData ? interaction.guild.channels.cache.get(logData.channelId) : null;

          if (logChannel?.isTextBased()) {
            await logChannel.send({ embeds: [embed] });
          }

          collector.stop();
        }
      });

      collector.on("end", async () => {
        try {
          await msg.edit({ components: [] });
        } catch {}
      });
    }

    // -----------------------------------------------------------
    // ----------------------- CLEAR WARNS ------------------------
    // -----------------------------------------------------------

    else if (sub === "clearwarns") {
      await interaction.deferReply();

      const member = interaction.options.getMember("member");
      if (!member) return interaction.editReply("❌ Member not found.");

      await Warns.deleteMany({ guildId: interaction.guild.id, userId: member.id });

      const embed = new EmbedBuilder()
        .setTitle("🧹 Warnings Cleared")
        .setDescription(`All warnings for ${member} have been cleared.`)
        .setColor("Green")
        .setFooter({ text: `Cleared by ${interaction.user.tag}` });

      await interaction.editReply({ embeds: [embed] });

      const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
      const logChannel = logData ? interaction.guild.channels.cache.get(logData.channelId) : null;

      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🧹 Warnings Cleared")
          .setColor("Green")
          .addFields(
            { name: "User", value: `${member.user.tag} (${member.id})` },
            { name: "Moderator", value: interaction.user.tag }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  }
};
