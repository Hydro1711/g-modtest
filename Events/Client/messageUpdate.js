const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const MessageLogs = require("../../Schemas/messageLogs");
const { messageUpdate: recordEditSnipe } = require("../../Commands/Moderation/editsnipe");

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage) {
    try {
      // ✅ Fetch partials if needed
      if (oldMessage.partial) oldMessage = await oldMessage.fetch();
      if (newMessage.partial) newMessage = await newMessage.fetch();

      if (!oldMessage.guild) return;
      if (oldMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return;

      // ✅ Feed edit-snipe cache
      try {
        recordEditSnipe(oldMessage, newMessage);
      } catch (err) {
        console.warn("[messageUpdate] Failed to record editsnipe:", err);
      }

      // ✅ Continue your message log logic
      const logData = await MessageLogs.findOne({ guildId: oldMessage.guild.id });
      if (!logData?.channelId) return;

      const logChannel = oldMessage.guild.channels.cache.get(logData.channelId);
      if (!logChannel) {
        console.warn(`[messageUpdate] Configured message log channel ${logData.channelId} not found.`);
        return;
      }

      const botMember = await oldMessage.guild.members.fetchMe();
      const perms = logChannel.permissionsFor(botMember);

      if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) {
        console.warn(`[messageUpdate] Missing ViewChannel permission in ${logChannel.id}`);
        return;
      }
      if (!perms.has(PermissionsBitField.Flags.SendMessages)) {
        console.warn(`[messageUpdate] Missing SendMessages permission in ${logChannel.id}`);
        return;
      }
      if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) {
        console.warn(`[messageUpdate] Missing EmbedLinks permission in ${logChannel.id}`);
        return;
      }

      const beforeContent =
        oldMessage.content?.length > 0 ? oldMessage.content.slice(0, 1024) : "[No text content]";
      const afterContent =
        newMessage.content?.length > 0 ? newMessage.content.slice(0, 1024) : "[No text content]";

      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("✏️ Message Edited")
        .addFields(
          { name: "User", value: `<@${oldMessage.author.id}> (${oldMessage.author.tag})`, inline: false },
          { name: "Channel", value: `<#${oldMessage.channel.id}>`, inline: false },
          { name: "Before", value: beforeContent, inline: false },
          { name: "After", value: afterContent, inline: false },
          { name: "Message ID", value: oldMessage.id, inline: false },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] }).catch((err) => {
        console.error(`[messageUpdate] Failed to send message log in ${logChannel.id}:`, err);
      });
    } catch (error) {
      console.error("[messageUpdate] Error handling message update:", error);
    }
  },
};
