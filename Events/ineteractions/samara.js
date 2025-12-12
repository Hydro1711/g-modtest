module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    if (!message || !message.content) return;
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // Trigger: "e39"
    if (content.includes("samara")) {
      return message.channel.send(
        "https://cdn.discordapp.com/attachments/1261060458144600106/1417879829222527067/ScreenRecording_09-14-2025_00-23-47_1.gif?ex=693ccf3e&is=693b7dbe&hm=104121a3f088512a1f89b9ee0981a7f4b1cc315717888153250ba2b8154e19db&"
      );
    }
  }
};
