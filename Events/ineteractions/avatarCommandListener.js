const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const trimmed = message.content.trim().toLowerCase();
    const permissions = message.channel.permissionsFor(message.guild.members.me);

    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) return;

    // === Avatar ===
    if (trimmed.startsWith("mod!avatar") || trimmed.startsWith("mod! avatar")) {
      const args = message.content.split(/\s+/).slice(1);
      const target = message.mentions.members.first() ||
                     message.guild.members.cache.get(args[0]) ||
                     message.member;

      const avatarUrl = target.displayAvatarURL({ size: 1024, extension: "png" });
      const embed = new EmbedBuilder()
        .setTitle(`${target.user.username}'s Avatar`)
        .setImage(avatarUrl)
        .setColor("Random")
        .addFields([{
          name: "Download Links",
          value: `[PNG](${target.displayAvatarURL({ extension: "png", size: 1024 })}) | ` +
                 `[JPG](${target.displayAvatarURL({ extension: "jpg", size: 1024 })}) | ` +
                 `[WEBP](${target.displayAvatarURL({ extension: "webp", size: 1024 })})`
        }])
        .setFooter({ text: "Click a link below to download the avatar." });

      await message.channel.send({ embeds: [embed] });
    }

    // === Banner ===
    else if (trimmed.startsWith("taxx!banner") || trimmed.startsWith("taxx! banner")) {
      const args = message.content.split(/\s+/).slice(1);
      let targetUser = message.mentions.users.first() ||
                       (args[0] && await message.client.users.fetch(args[0]).catch(() => null)) ||
                       message.author;
      const user = await message.client.users.fetch(targetUser.id, { force: true });

      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Banner`)
        .setColor(user.accentColor || "#2f3136");

      if (user.banner) {
        const bannerUrl = user.bannerURL({ size: 1024, extension: "png" });
        embed.setImage(bannerUrl)
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
    }
  },
};
