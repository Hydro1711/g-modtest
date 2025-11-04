const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const antiAttachmentSchema = require("../../Schemas/antiMultiAttachment.js");
const modLogSchema = require("../../Schemas/modLogs.js");
const config = require("../../config.json"); // DeveloperID is here

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    // Developer exception
    if (message.author.id === config.DeveloperID) {
      return; // skip all checks for developer
    }

    try {
      const guildData = await antiAttachmentSchema.findOne({ Guild: message.guild.id });
      if (!guildData || !guildData.Enabled) return;

      // Count attachments
      const attachmentCount = message.attachments.size;

      // Count links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.content.match(urlRegex) || [];

      const totalItems = attachmentCount + urls.length;

      if (totalItems > 1) {
        await message.delete().catch(() => {});

        // Send temporary warning
        const canSend = message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.SendMessages);
        if (canSend) {
          const warning = await message.channel.send("🚫 You can only send **one attachment or link per message**.").catch(() => null);
          if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
        }

        // Log to modlog channel if exists
        const modLogData = await modLogSchema.findOne({ Guild: message.guild.id });
        if (modLogData && modLogData.Channel) {
          const logChannel = message.guild.channels.cache.get(modLogData.Channel);
          if (logChannel && logChannel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
            const embed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("🚫 Multi-Attachment/Link Rule Violation")
              .addFields(
                { name: "User", value: `${message.author.tag} (${message.author.id})` },
                { name: "Channel", value: `${message.channel}` },
                { name: "Attachments", value: `${attachmentCount}` },
                { name: "Links", value: `${urls.length}` },
                { name: "Action", value: "Message deleted (more than one attachment/link)." }
              )
              .setTimestamp();
            await logChannel.send({ embeds: [embed] }).catch(() => {});
          }
        }
      }

    } catch (err) {
      console.error("Error in antiMultiAttachment event:", err);
    }
  }
};
