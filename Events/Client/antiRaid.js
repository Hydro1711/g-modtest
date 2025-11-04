const { EmbedBuilder, userMention, PermissionsBitField } = require("discord.js");
const ModLogs = require("../../Schemas/modLogs");
const config = require("../../config.json");

const messageMap = new Map();

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      const guild = message.guild;
      const guildId = guild.id;
      const userId = message.author.id;

      // Skip developers/exception IDs
      if (config.DeveloperID && config.DeveloperID.includes(userId)) return;

      const now = Date.now();
      const userMessages = messageMap.get(userId) || [];

      // Only keep messages in last 3 seconds
      const recent = userMessages.filter(m => now - m.timestamp < 3000);
      recent.push({ message, timestamp: now });
      messageMap.set(userId, recent);

      if (recent.length >= 5) { // 5+ messages in 3 seconds triggers timeout
        messageMap.delete(userId); // reset spam counter

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;

        // --- ✅ Permission + hierarchy checks ---
        const me = guild.members.me;
        if (!me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
          console.warn(`[AntiRaid] Missing "Moderate Members" permission in ${guild.name}`);
          return;
        }

        if (member.id === guild.ownerId) {
          console.warn("[AntiRaid] Cannot timeout the server owner.");
          return;
        }

        if (member.roles.highest.position >= me.roles.highest.position) {
          console.warn(`[AntiRaid] Cannot timeout ${member.user.tag} due to role hierarchy.`);
          return;
        }
        // ---------------------------------------

        // ✅ Apply 1-hour timeout
        const oneHour = 60 * 60 * 1000;
        await member.timeout(oneHour, "Anti-Raid: Spam detected");

        // DM the user
        const dmEmbed = new EmbedBuilder()
          .setTitle("🚨 You have been timed out")
          .setColor("Red")
          .setDescription(
            `You were timed out in **${guild.name}** for sending too many messages too quickly.\nPlease contact a moderator if this was a mistake.`
          )
          .setTimestamp();

        try {
          await member.send({ embeds: [dmEmbed] });
        } catch (err) {
          console.warn(`[AntiRaid] Could not DM ${member.user.tag}: ${err.message}`);
        }

        // Log to mod channel
        const modLogData = await ModLogs.findOne({ guildId });
        const logChannel = modLogData ? guild.channels.cache.get(modLogData.channelId) : null;
        if (logChannel && logChannel.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle("🚫 Anti-Raid Triggered")
            .setColor("Red")
            .addFields(
              { name: "User", value: `${userMention(userId)} (${userId})`, inline: false },
              { name: "Action", value: "Timed out for 1 hour (Anti-Raid Spam)", inline: false }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error("Error in antiRaid messageCreate:", error);
    }
  },
};
