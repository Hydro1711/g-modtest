const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const MessageLogs = require("../../Schemas/messageLogs");

module.exports = {
  name: "messageDelete",
  async execute(message) {
    if (!message.guild) return;
    if (!message.author || message.author.bot) return;

    try {
      const logData = await MessageLogs.findOne({ guildId: message.guild.id });
      if (!logData?.channelId) return;

      const logChannel = message.guild.channels.cache.get(logData.channelId);
      if (!logChannel) {
        console.warn(`[messageDelete] Configured message log channel ${logData.channelId} not found.`);
        return;
      }

      const botMember = await message.guild.members.fetchMe();
      const perms = logChannel.permissionsFor(botMember);

      if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) {
        console.warn(`[messageDelete] Missing ViewChannel permission in ${logChannel.id}`);
        return;
      }
      if (!perms.has(PermissionsBitField.Flags.SendMessages)) {
        console.warn(`[messageDelete] Missing SendMessages permission in ${logChannel.id}`);
        return;
      }
      if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) {
        console.warn(`[messageDelete] Missing EmbedLinks permission in ${logChannel.id}`);
        return;
      }

      // Trim long content
      const trimmedContent =
        message.content && message.content.length > 1024
          ? message.content.slice(0, 1021) + "..."
          : message.content || "[No text content]";

      const userTag = message.author?.tag || "Unknown User";
      const userId = message.author?.id || "Unknown";
      const channelId = message.channel?.id || "Unknown";
      const messageId = message.id || "Unknown";

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑️ Message Deleted")
        .addFields(
          { name: "User", value: `<@${userId}> (${userTag})`, inline: false },
          { name: "Channel", value: `<#${channelId}>`, inline: false },
          { name: "Content", value: trimmedContent, inline: false },
          { name: "Message ID", value: messageId, inline: false },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch((err) => {
        console.error(`[messageDelete] Failed to send message log in ${logChannel.id}:`, err);
      });
    } catch (error) {
      console.error("[messageDelete] Error handling message delete:", error);
    }
  },
};
