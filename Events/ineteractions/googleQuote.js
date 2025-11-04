const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { createCanvas } = require("@napi-rs/canvas");
const { isEnabled } = require("../../Functions/tools/quoteHelper"); // adjust path

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;
      if (!message.content.toLowerCase().startsWith("taxx!google")) return;

      if (!message.reference)
        return message.reply("🔎 Reply to a message you want to Google!");

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

      let text = quotedMessage.content || "No text to search";
      text = text
        .replace(/<a?:\w+:\d+>/g, " ")
        .replace(/\p{Extended_Pictographic}/gu, " ");

      const canvas = createCanvas(1000, 600);
      const ctx = canvas.getContext("2d");

      // Background white
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Google logo text
      ctx.font = "bold 72px Sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#4285F4";
      ctx.fillText("G", 420, 150);
      ctx.fillStyle = "#EA4335";
      ctx.fillText("o", 470, 150);
      ctx.fillStyle = "#FBBC05";
      ctx.fillText("o", 520, 150);
      ctx.fillStyle = "#4285F4";
      ctx.fillText("g", 570, 150);
      ctx.fillStyle = "#34A853";
      ctx.fillText("l", 610, 150);
      ctx.fillStyle = "#EA4335";
      ctx.fillText("e", 640, 150);

      // Search bar
      ctx.strokeStyle = "#dfe1e5";
      ctx.lineWidth = 2;
      ctx.strokeRect(250, 220, 500, 60);

      // Text inside search bar
      ctx.font = "24px Sans";
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.fillText(text.slice(0, 60), 270, 258);

      const buffer = canvas.toBuffer("image/png");
      const attachment = new AttachmentBuilder(buffer, { name: "google.png" });
      await message.reply({ files: [attachment] });

    } catch (err) {
      console.error("🔥 Google error:", err);
    }
  },
};
