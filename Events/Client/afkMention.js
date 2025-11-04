const AfkModel = require("../../Schemas/afk.js");

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const d = days > 0 ? `${days}d ` : "";
  const h = hours % 24 > 0 ? `${hours % 24}h ` : "";
  const m = minutes % 60 > 0 ? `${minutes % 60}m ` : "";
  const s = totalSeconds % 60 > 0 ? `${totalSeconds % 60}s` : "";

  return (d + h + m + s).trim() || "just now";
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const mentions = message.mentions.users;
      if (mentions.size === 0) return;

      for (const [mentionedId, user] of mentions) {
        if (mentionedId === userId) continue;

        const mentionedAfk = await AfkModel.findOne({ guildId, userId: mentionedId });
        if (mentionedAfk) {
          const sinceMs = Date.now() - new Date(mentionedAfk.timestamp).getTime();
          const duration = formatDuration(sinceMs);

          await message.channel.send({
            content: `💤 **${user.tag}** is currently AFK: "${mentionedAfk.reason}" (since ${duration} ago)`,
            allowedMentions: { repliedUser: false },
          });
        }
      }
    } catch (err) {
      console.error("Error checking mentioned AFK:", err);
    }
  },
};
