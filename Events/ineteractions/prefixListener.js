module.exports = {
  name: "messageCreate",

  async execute(message) {
    const PREFIX_REGEX = /^(g!|G!)\s?/; 

    try {
      if (message.author.bot || !message.guild) return;
      if (!PREFIX_REGEX.test(message.content)) return;

      // Extract command and args
      const args = message.content
        .slice(message.content.match(PREFIX_REGEX)[0].length)
        .trim()
        .split(/\s+/)
        .filter(Boolean); 

      const commandName = (args.shift() || "").toLowerCase();

      console.log(`📌 Prefix message received: ${message.content}`);
      console.log(`🔹 Detected command: ${commandName}`);
      console.log(`🔹 Arguments: ${args.join(", ") || "None"}`);

      const command = message.client.prefixCommands?.get(commandName);
      if (!command) {
        console.log(`⚠️ No prefix command found for: ${commandName}`);
        return;
      }

      console.log(`✅ Executing prefix command: ${commandName}`);
      await command.execute(message, args, message.client);
    } catch (err) {
      console.error("❌ Error in prefixListener:", err);
    }
  },
};
