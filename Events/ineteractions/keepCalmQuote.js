const { Message, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { isEnabled } = require("../../Functions/tools/quoteHelper");
const path = require("path");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;

      const trimmed = message.content.trim().toLowerCase();
      if (!trimmed.startsWith("mod!keepcalm")) return;

      if (!message.reference)
        return message.reply("❌ You need to reply to a message to use this command.");

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

      let userText = (quotedMessage.content || "something awesome").toUpperCase();
      userText = userText.replace(/<a?:\w+:\d+>/g, " ").replace(/\p{Extended_Pictographic}/gu, " ");

      const canvasWidth = 800;
      const canvasHeight = 1200;
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#E03C31";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Crown
      const crownPath = path.join(__dirname, "../../assets/keepcalmcrown/keepcalmcrown.png");
      const crown = await loadImage(crownPath);
      const crownWidth = 200;
      const crownHeight = 200;
      const crownY = 50;
      ctx.drawImage(crown, canvasWidth / 2 - crownWidth / 2, crownY, crownWidth, crownHeight);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";

      const maxWidth = 700;
      const spacing = 20;
      const crownBottom = crownY + crownHeight;
      const maxTextHeight = canvasHeight - crownBottom - 50;

      // Start with big font sizes
      let keepCalmFont = 100;
      let andFont = Math.floor(keepCalmFont * 0.6);
      let userFont = keepCalmFont;

      // Helper: wrap text into lines
      function wrapText(ctx, text, fontSize) {
        ctx.font = `bold ${fontSize}px Sans`;
        const words = text.split(/\s+/);
        const lines = [];
        let line = "";
        for (const word of words) {
          const testLine = line ? line + " " + word : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = testLine;
          }
        }
        if (line) lines.push(line);
        return lines;
      }

      // Shrink fonts until everything fits
      let userLines = wrapText(ctx, userText, userFont);
      let totalHeight = keepCalmFont + spacing + andFont + spacing + userLines.length * (userFont + spacing);

      while (totalHeight > maxTextHeight && keepCalmFont > 20) {
        keepCalmFont -= 2;
        andFont = Math.floor(keepCalmFont * 0.6);
        userFont = keepCalmFont;
        userLines = wrapText(ctx, userText, userFont);
        totalHeight = keepCalmFont + spacing + andFont + spacing + userLines.length * (userFont + spacing);
      }

      // Draw "KEEP CALM"
      ctx.font = `bold ${keepCalmFont}px Sans`;
      const keepCalmY = crownBottom + spacing + keepCalmFont;
      ctx.fillText("KEEP CALM", canvasWidth / 2, keepCalmY);

      // Draw "AND"
      ctx.font = `bold ${andFont}px Sans`;
      const andY = keepCalmY + spacing + andFont;
      ctx.fillText("AND", canvasWidth / 2, andY);

      // Draw user text
      ctx.font = `bold ${userFont}px Sans`;
      let startY = andY + spacing + userFont;
      for (const line of userLines) {
        ctx.fillText(line, canvasWidth / 2, startY);
        startY += userFont + spacing;
      }

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, { name: "keepcalm.png" });
      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error("🔥 Keep Calm error:", err);
    }
  },
};
