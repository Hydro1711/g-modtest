const { askBMWAI } = require("../utils/openai");
const { getIdentityResponse } = require("../utils/aiIdentity");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const prefix = "g!";

    /* ======================
       🤖 MENTION → BMW AI
       ====================== */
    if (message.mentions.has(client.user)) {
      const cleanContent = message.content
        .replace(`<@${client.user.id}>`, "")
        .replace(`<@!${client.user.id}>`, "")
        .trim();

      if (!cleanContent) {
        return message.reply(
          "Ask me something BMW-related. Engines, tuning, reliability."
        );
      }

      // 🔒 Forced identity
      const identityReply = getIdentityResponse(cleanContent);
      if (identityReply) {
        return message.reply(identityReply);
      }

      try {
        const reply = await askBMWAI(cleanContent);
        return message.reply(reply);
      } catch (err) {
        console.error("BMW AI ERROR:", err);
        return message.reply("BMW brain stalled. Try again.");
      }
    }

    /* ======================
       🧱 PREFIX COMMANDS
       ====================== */
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
