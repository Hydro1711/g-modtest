const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { createCanvas } = require("@napi-rs/canvas");
const { isEnabled } = require("../../Functions/tools/quoteHelper"); // adjust path

// Wrap text helper
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = "";
  let lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push({ text: line, y });
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  lines.push({ text: line, y });
  return lines;
}

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;
      if (!message.content.toLowerCase().startsWith("mod!newspaper")) return;

      if (!message.reference)
        return message.reply("📰 Reply to a message you want in the newspaper!");

      const quotedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );

      // Reject non-plain-text messages
      if (
        !quotedMessage ||
        quotedMessage.attachments.size > 0 ||
        quotedMessage.stickers.size > 0 ||
        quotedMessage.embeds.length > 0 ||
        /https?:\/\/\S+/.test(quotedMessage.content)
      ) {
        return message.reply(
          "❌ Can only quote plain text messages (no links, GIFs, stickers, or embeds)."
        );
      }

      if (!isEnabled(message.guild.id)) {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setDescription("❌ Quote commands are currently disabled in this server.");
        await message.channel.send({ embeds: [embed] });
        return;
      }

      let text = quotedMessage.content || "No text to print";
      text = text.replace(/<a?:\w+:\d+>/g, " ").replace(/\p{Extended_Pictographic}/gu, " ");

      const username = quotedMessage.member?.displayName || quotedMessage.author.username;

      // Temporary canvas for measuring
      let fontSize = 48;
      let lines = [];
      const tempCanvas = createCanvas(800, 600);
      const tempCtx = tempCanvas.getContext("2d");

      // Reduce font if text is too long to leave space for username
      while (fontSize > 16) {
        tempCtx.font = `bold ${fontSize}px Times New Roman`;
        lines = wrapText(tempCtx, text, 400, 180, 700, fontSize + 10);

        // Leave at least 80px at bottom for username
        const requiredHeight = 120 + lines.length * (fontSize + 10) + 80;
        if (requiredHeight <= 1200) break; // maximum allowed canvas height
        fontSize -= 2;
      }

      // Dynamic canvas height based on text and username
      const canvasHeight = Math.max(300, 120 + lines.length * (fontSize + 10) + 80);

      const canvas = createCanvas(800, canvasHeight);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#f4f1e9";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Masthead
      ctx.fillStyle = "#000";
      ctx.font = "bold 80px Times New Roman";
      ctx.textAlign = "center";
      ctx.fillText("THE TAXX TIMES", canvas.width / 2, 90);

      // Headline/body text
      ctx.font = `bold ${fontSize}px Times New Roman`;
      ctx.textAlign = "center";
      lines.forEach(line => ctx.fillText(line.text, canvas.width / 2, line.y));

      // Author line at bottom
      ctx.font = "28px Times New Roman"; // slightly bigger
      ctx.textAlign = "center";
      ctx.fillText(`~ ${username}`, canvas.width / 2, canvasHeight - 40);

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, { name: "newspaper.png" });
      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error("🔥 Newspaper error:", err);
    }
  },
};
