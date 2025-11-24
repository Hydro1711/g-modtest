const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");

// ===== Utility: Apply Vignette =====
function applyVignette(ctx, width, height) {
  const vignette = ctx.createRadialGradient(
    width * 0.3,
    height * 0.5,
    height * 0.1,
    width * 0.3,
    height * 0.5,
    width * 0.9
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// ===== Utility: Add Grain =====
function addGrain(ctx, width, height, intensity = 18) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }

  ctx.putImageData(imgData, 0, 0);
}

module.exports = {
  name: "quote",
  aliases: ["quotemessage", "q"],
  description: "Create a Heist-style quote using a replied message",

  async execute(message, args, client) {
    if (!message.reference)
      return message.reply("❌ You must **reply** to a message to quote it.");

    const referenced = await message.channel.messages.fetch(
      message.reference.messageId
    );

    const targetUser = referenced.author;
    const targetText = referenced.content || "No content.";

    const WIDTH = 994;
    const HEIGHT = 559;

    const state = {
      id: Date.now().toString(),
      theme: "blue",
      brightness: 1,
      contrast: 1,
      blur: 2,
      fog: 0,
      glitch: false,
      pfp: targetUser.displayAvatarURL({ extension: "png", size: 512 }),
      text: targetText
    };

    async function renderQuote() {
      const canvas = createCanvas(WIDTH, HEIGHT);
      const ctx = canvas.getContext("2d");

      // LOAD PROFILE PIC
      let avatar;
      try {
        avatar = await loadImage(state.pfp);
      } catch {
        avatar = null;
      }

      // LEFT PANEL: PFP FULL SCREEN
      if (avatar) {
        const side = Math.min(avatar.width, avatar.height);
        const sx = (avatar.width - side) / 2;
        const sy = (avatar.height - side) / 2;

        ctx.filter = `blur(${state.blur}px) brightness(${state.brightness}) contrast(${state.contrast})`;
        ctx.drawImage(avatar, sx, sy, side, side, 0, 0, WIDTH * 0.55, HEIGHT);
        ctx.filter = "none";
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, WIDTH * 0.55, HEIGHT);
      }

      // DARK FADE FROM LEFT TO RIGHT
      const fade = ctx.createLinearGradient(WIDTH * 0.45, 0, WIDTH * 0.7, 0);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(WIDTH * 0.45, 0, WIDTH * 0.55, HEIGHT);

      // RIGHT PANEL (BLACK)
      ctx.fillStyle = "#000";
      ctx.fillRect(WIDTH * 0.55, 0, WIDTH * 0.45, HEIGHT);

      // FOG EFFECT
      if (state.fog > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.04 * state.fog})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      // THEME TINT
      if (state.theme === "yellow") {
        ctx.fillStyle = "rgba(255,215,0,0.1)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      if (state.theme === "glitch") {
        ctx.fillStyle = "rgba(0,255,255,0.1)";
        ctx.fillRect(0, HEIGHT * 0.25, WIDTH, 5);
        ctx.fillStyle = "rgba(255,0,255,0.1)";
        ctx.fillRect(0, HEIGHT * 0.5, WIDTH, 5);
        ctx.fillStyle = "rgba(255,255,0,0.1)";
        ctx.fillRect(0, HEIGHT * 0.75, WIDTH, 5);
      }

      // APPLY VIGNETTE
      applyVignette(ctx, WIDTH, HEIGHT);

      // APPLY GRAIN
      addGrain(ctx, WIDTH, HEIGHT, 16);

      // TEXT AREA
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.shadowColor = "rgba(255,255,255,0.15)";
      ctx.shadowBlur = 6;

      let text = state.text;
      if (text.length > 260) text = text.slice(0, 257) + "...";

      const fontSize = text.length < 40 ? 38 : text.length > 140 ? 26 : 32;
      ctx.font = `${fontSize}px sans-serif`;

      const baseX = WIDTH * 0.60;
      const baseY = HEIGHT * 0.40;
      const maxWidth = WIDTH * 0.32;

      function wrap(txt) {
        const words = txt.split(/\s+/);
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
      let y = baseY;

      for (const line of lines) {
        ctx.fillText(line, baseX, y);
        y += fontSize * 1.25;
      }

      ctx.font = "22px sans-serif";
      ctx.fillStyle = "#ccc";
      ctx.fillText(`- ${targetUser.username}`, baseX, y + 20);

      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#888";
      ctx.fillText(`@${targetUser.tag}`, baseX, y + 45);

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.60)";
      ctx.font = "18px sans-serif";
      ctx.fillText(client.user.username, WIDTH - 20, HEIGHT - 20);

      return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "quote.png"
      });
    }

    const img = await renderQuote();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`brightness_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:brightnesscontrol:1442266667508830350>"),
      new ButtonBuilder().setCustomId(`contrast_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:contrast:1442266851408089250>"),
      new ButtonBuilder().setCustomId(`blur_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:dewpoint:1442266810660683939>"),
      new ButtonBuilder().setCustomId(`fog_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:dewpoint:1442266810660683939>"),
      new ButtonBuilder().setCustomId(`glitch_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:glitch:1442266700153360466>"),
      new ButtonBuilder().setCustomId(`theme_${state.id}`).setStyle(ButtonStyle.Primary).setEmoji("<:botsun:1442266721397506169>"),
      new ButtonBuilder().setCustomId(`gif_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:gifsquare:1442266831388672162>"),
      new ButtonBuilder().setCustomId(`refresh_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:refresh:1442266767564210256>"),
      new ButtonBuilder().setCustomId(`trash_${state.id}`).setStyle(ButtonStyle.Danger).setEmoji("<:trash:1442266748924723274>")
    );

    const sent = await message.reply({ files: [img], components: [row] });

    const collector = sent.createMessageComponentCollector({ time: 180000 });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== message.author.id)
        return btn.reply({ content: "❌ That's not your quote.", ephemeral: true });

      const [action, id] = btn.customId.split("_");
      if (id !== state.id) return;

      switch (action) {
        case "brightness":
          state.brightness += 0.1;
          break;
        case "contrast":
          state.contrast += 0.1;
          break;
        case "blur":
          state.blur = Math.min(state.blur + 1, 12);
          break;
        case "fog":
          state.fog = Math.min(state.fog + 1, 6);
          break;
        case "glitch":
          state.glitch = !state.glitch;
          break;
        case "theme":
          state.theme =
            state.theme === "blue"
              ? "yellow"
              : state.theme === "yellow"
              ? "glitch"
              : "blue";
          break;
        case "refresh":
          state.brightness = 1;
          state.contrast = 1;
          state.blur = 2;
          state.fog = 0;
          state.theme = "blue";
          state.glitch = false;
          break;
        case "trash":
          collector.stop();
          await btn.deferUpdate();
          return sent.delete().catch(() => {});
        case "gif":
          return btn.reply("⚠ GIF rendering is not implemented yet.");
      }

      const updated = await renderQuote();
      return btn.update({ files: [updated], components: [row] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
