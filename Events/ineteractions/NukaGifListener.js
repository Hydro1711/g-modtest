const { PermissionsBitField } = require("discord.js");
const IgnoredUser = require("../../Schemas/ignoredUsers.js");

const nukaCooldown = new Set();

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();
    if (!contentLower.includes("nuka")) return;

    const userId = message.author.id;
    const permissions = message.channel.permissionsFor(message.guild.members.me);

    const ignored = await IgnoredUser.findOne({ userId });
    if (ignored) {
      await message.channel.send(`<@${userId}> The owner does not think you are cool enough to use my commands L`);
      return;
    }

    if (nukaCooldown.has(userId)) return;
    nukaCooldown.add(userId);
    setTimeout(() => nukaCooldown.delete(userId), 7000);

    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) return;

    await message.channel.send("https://tenor.com/view/on-nuka-on-nuka-fallout-76-gif-1148409109437566716");
  },
};
