const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");

// =====================
// Utility: Vignette
// =====================
function applyVignette(ctx, width, height, strength = 0.75) {
  const vignette = ctx.createRadialGradient(
    width * 0.3,
    height * 0.5,
    height * 0.1,
    width * 0.3,
    height * 0.5,
    width * 0.9
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// =====================
// Utility: Grain
// =====================
function addGrain(ctx, width, height, intensity = 16) {
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
    // Require a reply
    if (!message.reference) {
      return message.reply("❌ You must **reply** to a message to quote it.");
    }

    const referenced = await message.channel.messages.fetch(
      message.reference.messageId
    );

    const targetUser = referenced.author;
    const targetText = referenced.content || "No content.";

    // Base dimensions for modes
    const CLASSIC_WIDTH = 994;
    const CLASSIC_HEIGHT = 559;

    const NEW_WIDTH = 994;
    const NEW_HEIGHT = 1050;

    // Global state for this quote instance
    const state = {
      id: Date.now().toString(),
      mode: "classic", // "classic" | "new"
      theme: "blue",   // "blue" | "yellow" | "glitch"
      brightness: 1,
      contrast: 1,
      blur: 2,
      fog: 0,
      glitch: false,
      pfp: targetUser.displayAvatarURL({ extension: "png", size: 512 }),
      text: targetText
    };

    // =====================
    // RENDER FUNCTION
    // =====================
    async function renderQuote() {
      const isNew = state.mode === "new";

      const width = isNew ? NEW_WIDTH : CLASSIC_WIDTH;
      const height = isNew ? NEW_HEIGHT : CLASSIC_HEIGHT;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Load avatar
      let avatar;
      try {
        avatar = await loadImage(state.pfp);
      } catch {
        avatar = null;
      }

      // -------------------------
      // BACKGROUND (both modes)
      // -------------------------
      if (avatar) {
        // Square crop of avatar
        const side = Math.min(avatar.width, avatar.height);
        const sx = (avatar.width - side) / 2;
        const sy = (avatar.height - side) / 2;

        // Canvas filter (blur, brightness, contrast)
        try {
          ctx.filter = `blur(${state.blur}px) brightness(${state.brightness}) contrast(${state.contrast})`;
        } catch {
          // in case filter isn't supported, silently ignore
        }

        // Draw avatar full background for both modes
        ctx.drawImage(avatar, sx, sy, side, side, 0, 0, width * (isNew ? 1 : 0.55), height);

        // Clear filter
        try {
          ctx.filter = "none";
        } catch {}
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, width * (isNew ? 1 : 0.55), height);
      }

      // -------------------------
      // CLASSIC MODE RIGHT PANEL
      // -------------------------
      if (!isNew) {
        // Fade from left image to right panel
        const fade = ctx.createLinearGradient(width * 0.45, 0, width * 0.7, 0);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = fade;
        ctx.fillRect(width * 0.45, 0, width * 0.55, height);

        // Solid black right panel
        ctx.fillStyle = "#000";
        ctx.fillRect(width * 0.55, 0, width * 0.45, height);
      } else {
        // NEW MODE → overlay gradual dark gradient from center downwards
        const vertical = ctx.createLinearGradient(0, 0, 0, height);
        vertical.addColorStop(0, "rgba(0,0,0,0.25)");
        vertical.addColorStop(0.4, "rgba(0,0,0,0.6)");
        vertical.addColorStop(0.75, "rgba(0,0,0,0.95)");
        vertical.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = vertical;
        ctx.fillRect(0, 0, width, height);
      }

      // -------------------------
      // FOG / DEWPOINT
      // -------------------------
      if (state.fog > 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.04 * state.fog})`;
        ctx.fillRect(0, 0, width, height);
      }

      // -------------------------
      // THEME TINT
      // -------------------------
      if (state.theme === "yellow") {
        ctx.fillStyle = "rgba(255,215,0,0.10)";
        ctx.fillRect(0, 0, width, height);
      }

      if (state.theme === "glitch" || state.glitch) {
        ctx.fillStyle = "rgba(0,255,255,0.22)";
        ctx.fillRect(0, height * 0.20, width, 6);

        ctx.fillStyle = "rgba(255,0,255,0.22)";
        ctx.fillRect(0, height * 0.48, width, 6);

        ctx.fillStyle = "rgba(255,255,0,0.22)";
        ctx.fillRect(0, height * 0.76, width, 6);
      }

      // -------------------------
      // VIGNETTE + GRAIN
      // -------------------------
      applyVignette(ctx, width, height, isNew ? 0.8 : 0.7);
      addGrain(ctx, width, height, isNew ? 18 : 16);

      // -------------------------
      // TEXT RENDERING
      // -------------------------
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = 8;

      let text = state.text;
      if (text.length > (isNew ? 120 : 260)) {
        text = text.slice(0, (isNew ? 117 : 257)) + "...";
      }

      if (!isNew) {
        // ===== CLASSIC MODE =====
        ctx.fillStyle = "#fff";
        const fontSize = text.length < 40 ? 38 : text.length > 140 ? 26 : 32;
        ctx.font = `${fontSize}px sans-serif`;

        const baseX = width * 0.60;
        const baseY = height * 0.40;
        const maxWidth = width * 0.32;

        function wrap(txt) {
          const words = txt.split(/\s+/);
          const lines = [];
          let line = "";
          for (const w of words) {
            const test = line ? line + " " + w : w;
            if (ctx.measureText(test).width > maxWidth) {
              lines.push(line);
              line = w;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
          return lines;
        }

        const lines = wrap(text);
        let y = baseY;

        ctx.textAlign = "left";

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

        // Watermark bottom-right
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,0.60)";
        ctx.font = "18px sans-serif";
        ctx.fillText(client.user.username, width - 20, height - 20);
      } else {
        // ===== NEW MODE (full-height) =====
        ctx.fillStyle = "#ffffff";
        const fontSize = text.length < 30 ? 52 : text.length > 90 ? 34 : 42;
        ctx.font = `${fontSize}px sans-serif`;

        const centerX = width / 2;
        const centerY = height * 0.55;
        const maxWidth = width * 0.7;

        function wrapNew(txt) {
          const words = txt.split(/\s+/);
          const lines = [];
          let line = "";
          for (const w of words) {
            const test = line ? line + " " + w : w;
            if (ctx.measureText(test).width > maxWidth) {
              lines.push(line);
              line = w;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
          return lines;
        }

        const lines = wrapNew(text);
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;

        let y = centerY - totalHeight / 2;

        for (const line of lines) {
          ctx.fillText(line, centerX, y);
          y += lineHeight;
        }

        // Underline
        const underlineY = y + 30;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        const underlineWidth = width * 0.25;
        ctx.beginPath();
        ctx.moveTo(centerX - underlineWidth / 2, underlineY);
        ctx.lineTo(centerX + underlineWidth / 2, underlineY);
        ctx.stroke();

        // Username + tag below
        ctx.font = "26px sans-serif";
        ctx.fillStyle = "#e0e0e0";
        ctx.fillText(targetUser.username, centerX, underlineY + 40);

        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#a0a0a0";
        ctx.fillText(`@${targetUser.tag}`, centerX, underlineY + 70);

        // Watermark bottom-right
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,0.60)";
        ctx.font = "20px sans-serif";
        ctx.fillText("heist.lol", width - 24, height - 22); // stylistic nod
      }

      // Return attachment
      return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "quote.png"
      });
    }

    // Initial render
    const img = await renderQuote();

    // =====================
    // BUTTON ROWS
    // =====================

    // Row 1 (5 max)
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`brightness_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:brightnesscontrol:1442266667508830350>"),

      new ButtonBuilder()
        .setCustomId(`contrast_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:contrast:1442266851408089250>"),

      new ButtonBuilder()
        .setCustomId(`blur_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:dewpoint:1442266810660683939>"),

      new ButtonBuilder()
        .setCustomId(`fog_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:dewpoint:1442266810660683939>"),

      new ButtonBuilder()
        .setCustomId(`glitch_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:glitch:1442266700153360466>")
    );

    // Row 2 (5 max)
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`theme_${state.id}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("<:botsun:1442266721397506169>"),

      new ButtonBuilder()
        .setCustomId(`gif_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:gifsquare:1442266831388672162>"),

      new ButtonBuilder()
        .setCustomId(`refresh_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:refresh:1442266767564210256>"),

      new ButtonBuilder()
        .setCustomId(`new_${state.id}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:newproduct:1442268874107257025>"),

      new ButtonBuilder()
        .setCustomId(`trash_${state.id}`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<:trash:1442266748924723274>")
    );

    const sent = await message.reply({
      files: [img],
      components: [row1, row2]
    });

    // =====================
    // INTERACTION HANDLER
    // =====================
    const collector = sent.createMessageComponentCollector({ time: 180000 });

    collector.on("collect", async (btn) => {
      // Only original author can interact
      if (btn.user.id !== message.author.id) {
        return btn.reply({
          content: "❌ Only the quote creator can use these controls.",
          ephemeral: true
        });
      }

      const [action, id] = btn.customId.split("_");
      if (id !== state.id) return;

      switch (action) {
        case "brightness":
          state.brightness = Math.min(state.brightness + 0.1, 2);
          break;
        case "contrast":
          state.contrast = Math.min(state.contrast + 0.1, 2.2);
          break;
        case "blur":
          state.blur = Math.min(state.blur + 1, 12);
          break;
        case "fog":
          state.fog = Math.min(state.fog + 1, 8);
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
        case "gif":
          return btn.reply({
            content:
              "⚠ GIF rendering is not implemented yet, but the button is reserved for future upgrades.",
            ephemeral: true
          });
        case "refresh":
          state.brightness = 1;
          state.contrast = 1;
          state.blur = 2;
          state.fog = 0;
          state.theme = "blue";
          state.glitch = false;
          state.mode = "classic";
          break;
        case "new":
          state.mode = state.mode === "classic" ? "new" : "classic";
          break;
        case "trash":
          collector.stop();
          await btn.deferUpdate();
          return sent.delete().catch(() => {});
      }

      const updated = await renderQuote();
      return btn.update({ files: [updated], components: [row1, row2] });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
