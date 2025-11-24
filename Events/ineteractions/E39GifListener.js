module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (!message || !message.content) return;
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // Trigger: "e39"
    if (content.includes("e39")) {
      return message.channel.send(
        "https://tenor.com/view/bmw-bmw-m5-bmw-m5-e39-death-stare-gif-7166102497377010966"
      );
    }
  }
};
