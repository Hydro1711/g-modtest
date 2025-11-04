const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "messageCreateBanner",
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;

      const trimmed = message.content.toLowerCase().trim();
      if (!trimmed.startsWith("taxx!banner") && !trimmed.startsWith("taxx! banner")) return;

      if (!message.channel.permissionsFor(message.guild.members.me)?.has(PermissionsBitField.Flags.SendMessages)) return;

      const args = message.content.split(/\s+/).slice(1);
      const targetUser =
        message.mentions.users?.first() ||
        (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
        message.author;

      if (!targetUser) return;

      const user = await message.client.users.fetch(targetUser.id, { force: true }).catch(() => null);
      if (!user) {
        await message.channel.send("Could not fetch that user.");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Banner`)
        .setColor(user.accentColor ? `#${user.accentColor.toString(16)}` : "#2f3136");

      if (user.banner) {
        embed.setImage(user.bannerURL({ size: 1024, extension: "png" }))
          .addFields([{
            name: "Download Links",
            value: `[PNG](${user.bannerURL({ extension: "png", size: 1024 })}) | ` +
                   `[JPG](${user.bannerURL({ extension: "jpg", size: 1024 })}) | ` +
                   `[WEBP](${user.bannerURL({ extension: "webp", size: 1024 })})`
          }])
          .setFooter({ text: "Click a link below to download the banner." });
      } else {
        embed.setDescription(`This user has no banner set. Their accent color is: **${user.accentColor ? `#${user.accentColor.toString(16)}` : "None"}**`);
      }

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Error in bannerCommand listener:", err);
    }
  },
};
