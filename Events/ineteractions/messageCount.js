const MessageCount = require("../../Schemas/messageCount.js");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    try {
      await MessageCount.findOneAndUpdate(
        { userId: message.author.id, guildId: message.guild.id },
        { $inc: { messages: 1 } },
        { upsert: true }
      );
    } catch (err) {
      console.error("Failed to increment message count:", err);
    }
  },
};
