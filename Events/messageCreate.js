const { askBMWAI } = require("../utils/openai");
const { getIdentityResponse } = require("../utils/aiIdentity");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    // Ignore bots / DMs
    if (message.author.bot || !message.guild) return;

    const prefix = "g!";

    /* =========================
       🤖 AI MENTION HANDLER
       ========================= */
    if (message.mentions.has(client.user)) {
      const cleanContent = message.content
        .replace(`<@${client.user.id}>`, "")
        .replace(`<@!${client.user.id}>`, "")
        .trim();

      if (!cleanContent) {
        return message.reply(
          "Ask me something BMW-related. Engines, tuning, reliability, whatever."
        );
      }

      // 🔒 locked identity responses
      const identityReply = getIdentityResponse(cleanContent);
      if (identityReply) {
        return message.reply(identityReply);
      }

      try {
        const aiReply = await askBMWAI(cleanContent);
        return message.reply(aiReply);
      } catch (err) {
        console.error("AI ERROR:", err);
        return message.reply("Something broke on my end. Try again.");
      }
    }

    /* =========================
       🧱 PREFIX COMMAND HANDLER
       ========================= */
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.prefixCommands.get(cmdName);
    if (!cmd) return;

    try {
      await cmd.execute(message, args, client);
    } catch (err) {
      console.error(err);
      return message.reply("❌ Error executing command.");
    }
  }
};
