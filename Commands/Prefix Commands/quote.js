const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");

module.exports = {
  name: "quote",
  aliases: ["quotemessage", "q"],
  description: "Create a Heist-style quote using a replied message",

  async execute(message, args, client) {
    // Must be a reply
    if (!message.reference)
      return message.reply("❌ You must **reply** to a message to quote it.");

    const referenced = await message.channel.messages.fetch(
      message.reference.messageId
    );

    const targetUser = referenced.author;
    const targetText = referenced.content || "No content.";

    // State for theme & buttons
    const state = {
      id: Date.now().toString(),
      theme: "blue",
      user: targetUser,
      text: targetText
    };

    async function renderQuote() {
      const width = 900;
      const height = 1200;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Load avatar as background
      let avatar;
      try {
        avatar = await loadImage(
          targetUser.displayAvatarURL({ extension: "png", size: 512 })
        );
      } catch {}

      if (avatar) {
        const scale = Math.max(width / avatar.width, height / avatar.height);
        ctx.drawImage(
          avatar,
          width / 2 - (avatar.width * scale) / 2,
          height / 2 - (avatar.height * scale) / 2,
          avatar.width * scale,
          avatar.height * scale
        );
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
      }

      // Overlay theme
      if (state.theme === "glitch") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(0,255,255,0.25)";
        ctx.fillRect(0, height * 0.25, width, 20);

        ctx.fillStyle = "rgba(255,0,255,0.25)";
        ctx.fillRect(0, height * 0.5, width, 20);

        ctx.fillStyle = "rgba(255,255,0,0.25)";
        ctx.fillRect(0, height * 0.75, width, 20);
      } else {
        ctx.fillStyle = "rgba(5, 15, 50, 0.70)";
        ctx.fillRect(0, 0, width, height);
      }

      // Quote text
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";

      let text = state.text;
      if (text.length > 300) text = text.slice(0, 297) + "...";

      let fontSize = 52;
      if (text.length < 40) fontSize = 64;
      if (text.length > 140) fontSize = 40;

      ctx.font = `${fontSize}px sans-serif`;

      const paddingX = width * 0.12;
      const maxWidth = width - paddingX * 2;

      function wrap(text) {
        const words = text.split(/\s+/);
        const lines = [];
        let line = "";

        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = w;
          } else line = test;
        }
        if (line) lines.push(line);
        return lines;
      }

      const lines = wrap(text);
      const lineHeight = fontSize * 1.3;
      const totalHeight = lines.length * lineHeight;

      let y = height / 2 - totalHeight / 2;
      for (const line of lines) {
        ctx.fillText(line, width / 2, y);
        y += lineHeight;
      }

      // Username
      ctx.font = `${Math.floor(fontSize * 0.7)}px sans-serif`;
      ctx.fillStyle = "#dfe7ff";
      ctx.fillText(`– ${targetUser.username}`, width / 2, y + 40);

      ctx.font = `${Math.floor(fontSize * 0.5)}px sans-serif`;
      ctx.fillText(`@${targetUser.tag}`, width / 2, y + 80);

      // Watermark
      ctx.font = "28px sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(client.user.username, width - 40, height - 40);

      return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "quote.png"
      });
    }

    const image = await renderQuote();

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`blue_${state.id}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("<:botsun:1442266721397506169>"),

      new ButtonBuilder()
        .setCustomId(`glitch_${state.id}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("<:glitch:1442266700153360466>"),

      new ButtonBuilder()
        .setCustomId(`refresh_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:refresh:1442266767564210256>"),

      new ButtonBuilder()
        .setCustomId(`trash_${state.id}`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<:trash:1442266748924723274>")
    );

    const sent = await message.reply({
      files: [image],
      components: [row]
    });

    // Collector
    const collector = sent.createMessageComponentCollector({ time: 120000 });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== message.author.id)
        return btn.reply({
          content: "❌ Only the quote creator can use these buttons.",
          ephemeral: true
        });

      const [action, id] = btn.customId.split("_");
      if (id !== state.id) return;

      if (action === "trash") {
        await btn.deferUpdate();
        collector.stop();
        return sent.delete().catch(() => {});
      }

      if (action === "blue") state.theme = "blue";
      if (action === "glitch") state.theme = "glitch";

      const updated = await renderQuote();
      return btn.update({ files: [updated], components: [row] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
