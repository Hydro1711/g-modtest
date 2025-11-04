const { Message, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { isEnabled } = require("../../Functions/tools/quoteHelper");

// Wrap text and make sure it always fits
function wrapText(ctx, text, x, y, maxWidth, lineHeight, canvasHeight) {
  const words = text.split(/\s+/);
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;

      // if we are out of canvas height, stop
      if (y > canvasHeight - lineHeight * 2) {
        ctx.fillText("…", x, y); // add ellipsis
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;

      const trimmed = message.content.trim().toLowerCase();
      if (!trimmed.startsWith("mod!quote")) return;

      if (!message.reference)
        return message.reply("❌ You need to reply to a message to use this.");

      const quotedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );

      if (!quotedMessage || quotedMessage.attachments.size > 0)
        return message.reply("❌ Can only quote plain text messages.");

      if (!isEnabled(message.guild.id)) {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription("❌ Quote commands are currently disabled in this server.");
        await message.channel.send({ embeds: [embed] });
        return;
      }

      // --- 🧠 Fix mention resolution ---
      let quoteText = quotedMessage.content || "No text to quote";

      // Replace mentions with readable text
      quoteText = quoteText
        // user mentions
        .replace(/<@!?(\d+)>/g, (match, id) => {
          const user = message.client.users.cache.get(id);
          return user ? `@${user.username}` : "@unknown";
        })
        // role mentions
        .replace(/<@&(\d+)>/g, (match, id) => {
          const role = message.guild.roles.cache.get(id);
          return role ? `@${role.name}` : "@deleted-role";
        })
        // channel mentions
        .replace(/<#(\d+)>/g, (match, id) => {
          const channel = message.guild.channels.cache.get(id);
          return channel ? `#${channel.name}` : "#deleted-channel";
        });

      // Replace all emojis (unicode + custom Discord emojis) with a space
      quoteText = quoteText
        .replace(/<a?:\w+:\d+>/g, " ") // custom Discord emoji
        .replace(/\p{Extended_Pictographic}/gu, " "); // unicode emoji

      // Load user avatar as background
      const avatarURL =
        quotedMessage.author?.displayAvatarURL?.({ extension: "png", size: 1024 }) ||
        "https://cdn.discordapp.com/embed/avatars/0.png";
      const avatar = await loadImage(avatarURL);

      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext("2d");

      // Draw avatar as background
      const ratio = Math.max(canvas.width / avatar.width, canvas.height / avatar.height);
      const avatarWidth = avatar.width * ratio;
      const avatarHeight = avatar.height * ratio;
      const offsetX = (canvas.width - avatarWidth) / 2;
      const offsetY = (canvas.height - avatarHeight) / 2;
      ctx.drawImage(avatar, offsetX, offsetY, avatarWidth, avatarHeight);

      // Apply dark overlay
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert to grayscale
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);

      // Adjust font size dynamically
      let fontSize = 48;
      ctx.font = `italic ${fontSize}px Sans`;
      while (ctx.measureText(quoteText).width > 700 && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `italic ${fontSize}px Sans`;
      }

      // Draw quote text
      ctx.fillStyle = "#ffffff";
      wrapText(ctx, quoteText, 50, 80, 700, fontSize + 4, canvas.height);

      // Draw display name
      const displayName =
        quotedMessage.member?.displayName || quotedMessage.author.username;
      ctx.font = "bold 32px Sans";
      ctx.fillStyle = "#fff";
      ctx.fillText(displayName, 50, canvas.height - 70);

      // Draw tag
      const discordTag = quotedMessage.author.tag;
      ctx.font = "24px Sans";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(discordTag, 50, canvas.height - 40);

      // Footer text
      ctx.textAlign = "right";
      ctx.font = "16px Sans";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      const botText = `${message.client.user?.username || "Bot"} • made with mod!quote`;
      ctx.fillText(botText, canvas.width - 10, canvas.height - 10);

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, { name: "quote.png" });
      await message.reply({ files: [attachment] });
    } catch (error) {
      console.error("🔥 Error in quote messageCreate:", error);
    }
  },
};
