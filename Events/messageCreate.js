module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        // Ignore bots
        if (message.author.bot || !message.guild) return;

        const prefix = "g!";

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
