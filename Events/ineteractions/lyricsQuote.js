const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;
      if (!message.content.toLowerCase().startsWith("taxx!lyrics")) return;
      if (!message.reference) return message.reply("❌ Reply to a message to share lyrics!");

      const quotedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );
      if (!quotedMessage || quotedMessage.attachments.size > 0)
        return message.reply("❌ Can only quote plain text messages.");

      let lyrics = quotedMessage.content
        .replace(/<a?:\w+:\d+>/g, " ")
        .replace(/\p{Extended_Pictographic}/gu, " ");
      const songTitle = lyrics.split(" ")[0] || "SONG";
      const nickname = quotedMessage.member?.displayName || quotedMessage.author.username;

      const width = 720;
      const height = 1600;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#FFE5B4";
      ctx.fillRect(0, 0, width, height);

      // Top bar
      ctx.fillStyle = "#000";
      ctx.font = "bold 32px Sans";
      ctx.textAlign = "center";
      ctx.fillText("Share Lyrics", width / 2, 70);

      // Back arrow
      ctx.beginPath();
      ctx.moveTo(50, 60);
      ctx.lineTo(30, 70);
      ctx.lineTo(50, 80);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Frame setup
      const padding = 20;
      const avatarSize = 100;
      const maxTextWidth = 460;
      let fontSize = 36;

      // Wrap text function
      function wrapText(ctx, text, maxWidth) {
        const words = text.split(/\s+/);
        const lines = [];
        let line = "";
        for (const word of words) {
          const testLine = line ? line + " " + word : word;
          if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = testLine;
          }
        }
        if (line) lines.push(line);
        return lines;
      }

      const tempCanvas = createCanvas(width, height);
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.font = `bold ${fontSize}px Sans`;
      let lines = wrapText(tempCtx, lyrics, maxTextWidth);

      // Frame square size
      let frameSize = Math.max(avatarSize + 4 * padding + lines.length * (fontSize + 12), 500);
      if (frameSize > 700) frameSize = 700;
      const frameX = (width - frameSize) / 2;
      const frameY = (height - frameSize) / 2;
      const frameRadius = 15;

      // ------------------- Realistic shadow -------------------
function drawShadow() {
  const shadowSpread = 20;

  // Corner shadows
  function drawCorner(x, y) {
    const radius = shadowSpread;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, "rgba(0,0,0,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCorner(frameX + frameRadius, frameY + frameRadius); // top-left
  drawCorner(frameX + frameSize - frameRadius, frameY + frameRadius); // top-right
  drawCorner(frameX + frameRadius, frameY + frameSize - frameRadius); // bottom-left
  drawCorner(frameX + frameSize - frameRadius, frameY + frameSize - frameRadius); // bottom-right

  // Top shadow
  const topGradient = ctx.createLinearGradient(frameX, frameY - shadowSpread, frameX, frameY);
  topGradient.addColorStop(0, "rgba(0,0,0,0.0)");
  topGradient.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = topGradient;
  ctx.fillRect(frameX + frameRadius, frameY - shadowSpread, frameSize - 2 * frameRadius, shadowSpread);

  // Bottom shadow
  const bottomGradient = ctx.createLinearGradient(frameX, frameY + frameSize, frameX, frameY + frameSize + shadowSpread);
  bottomGradient.addColorStop(0, "rgba(0,0,0,0.15)");
  bottomGradient.addColorStop(1, "rgba(0,0,0,0.0)");
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(frameX + frameRadius, frameY + frameSize, frameSize - 2 * frameRadius, shadowSpread);

  // Left shadow
  const leftGradient = ctx.createLinearGradient(frameX - shadowSpread, frameY, frameX, frameY);
  leftGradient.addColorStop(0, "rgba(0,0,0,0.15)");
  leftGradient.addColorStop(1, "rgba(0,0,0,0.0)");
  ctx.fillStyle = leftGradient;
  ctx.fillRect(frameX - shadowSpread, frameY + frameRadius, shadowSpread, frameSize - 2 * frameRadius);

  // Right shadow
  const rightGradient = ctx.createLinearGradient(frameX + frameSize, frameY, frameX + frameSize + shadowSpread, frameY);
  rightGradient.addColorStop(0, "rgba(0,0,0,0.15)");
  rightGradient.addColorStop(1, "rgba(0,0,0,0.0)");
  ctx.fillStyle = rightGradient;
  ctx.fillRect(frameX + frameSize, frameY + frameRadius, shadowSpread, frameSize - 2 * frameRadius);
}

drawShadow();

      // Frame background
      ctx.fillStyle = "#FFDAB9";
      ctx.beginPath();
      ctx.moveTo(frameX + frameRadius, frameY);
      ctx.lineTo(frameX + frameSize - frameRadius, frameY);
      ctx.quadraticCurveTo(frameX + frameSize, frameY, frameX + frameSize, frameY + frameRadius);
      ctx.lineTo(frameX + frameSize, frameY + frameSize - frameRadius);
      ctx.quadraticCurveTo(frameX + frameSize, frameY + frameSize, frameX + frameSize - frameRadius, frameY + frameSize);
      ctx.lineTo(frameX + frameRadius, frameY + frameSize);
      ctx.quadraticCurveTo(frameX, frameY + frameSize, frameX, frameY + frameSize - frameRadius);
      ctx.lineTo(frameX, frameY + frameRadius);
      ctx.quadraticCurveTo(frameX, frameY, frameX + frameRadius, frameY);
      ctx.fill();

      // "Tap for more" above frame
      ctx.fillStyle = "#000";
      ctx.font = "20px Sans";
      ctx.textAlign = "center";
      ctx.fillText("Tap for more", width / 2, frameY - 10);

      // Avatar
      const avatarURL = quotedMessage.author.displayAvatarURL({ extension: "png", size: 1024 });
      const avatar = await loadImage(avatarURL);
      ctx.drawImage(avatar, frameX + padding, frameY + padding, avatarSize, avatarSize);

      // Song title
      ctx.fillStyle = "#000";
      ctx.font = "bold 28px Sans";
      ctx.textAlign = "left";
      ctx.fillText(songTitle, frameX + padding + avatarSize + 20, frameY + padding + 30);

      // Nickname
      ctx.font = "24px Sans";
      ctx.fillText(nickname, frameX + padding + avatarSize + 20, frameY + padding + 70);

      // Lyrics
      ctx.font = `bold ${fontSize}px Sans`;
      let startY = frameY + padding + avatarSize + 50;
      for (const line of lines) {
        ctx.fillText(line, frameX + padding, startY);
        startY += fontSize + 12;
      }

      // Bottom homebar
      const homebarWidth = 200;
      const homebarHeight = 10;
      const homebarX = width / 2 - homebarWidth / 2;
      const homebarY = height - 50;
      const radius = homebarHeight / 2;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(homebarX + radius, homebarY);
      ctx.lineTo(homebarX + homebarWidth - radius, homebarY);
      ctx.quadraticCurveTo(homebarX + homebarWidth, homebarY, homebarX + homebarWidth, homebarY + radius);
      ctx.lineTo(homebarX + homebarWidth, homebarY + homebarHeight - radius);
      ctx.quadraticCurveTo(homebarX + homebarWidth, homebarY + homebarHeight, homebarX + homebarWidth - radius, homebarY + homebarHeight);
      ctx.lineTo(homebarX + radius, homebarY + homebarHeight);
      ctx.quadraticCurveTo(homebarX, homebarY + homebarHeight, homebarX, homebarY + homebarHeight - radius);
      ctx.lineTo(homebarX, homebarY + radius);
      ctx.quadraticCurveTo(homebarX, homebarY, homebarX + radius, homebarY);
      ctx.fill();

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, { name: "lyrics.png" });
      await message.reply({ files: [attachment] });

    } catch (err) {
      console.error("🔥 Lyrics error:", err);
    }
  },
};
