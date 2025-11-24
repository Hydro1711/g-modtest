const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");

module.exports = {
  name: "quote",
  aliases: ["q", "quotemessage"],
  description: "Create a Heist-style quote from a replied message",

  async execute(message, args, client) {
    try {
      // Must be reply
      if (!message.reference)
        return message.reply("❌ You must reply to a message to quote it.");

      const referenced = await message.channel.messages.fetch(
        message.reference.messageId
      );

      const user = referenced.author;
      const text = referenced.content || "No content.";

      // State
      const state = {
        id: Date.now().toString(),
        mode: "classic", // classic | new
        blur: 0,
        brightness: 1,
        contrast: 1,
        fog: 0,
        glitch: false
      };

      // === RENDER CLASSIC MODE (left img + right text)
      async function renderClassic() {
        const width = 1200;
        const height = 650;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Load PFP
        let avatar;
        try {
          avatar = await loadImage(
            user.displayAvatarURL({ extension: "png", size: 1024 })
          );
        } catch (e) {}

        // Draw left image (fill left side)
        if (avatar) {
          const scale = Math.max((width * 0.55) / avatar.width, height / avatar.height);
          ctx.drawImage(
            avatar,
            width * 0.55 / 2 - (avatar.width * scale) / 2,
            height / 2 - (avatar.height * scale) / 2,
            avatar.width * scale,
            avatar.height * scale
          );
        } else {
          ctx.fillStyle = "#111";
          ctx.fillRect(0, 0, width, height);
        }

        // Apply filters
        if (state.blur > 0) {
          ctx.filter = `blur(${state.blur}px)`;
        }
        ctx.globalAlpha = state.brightness;
        ctx.globalCompositeOperation = "source-over";

        // Classic fade (smooth fade into black panel)
        const fade = ctx.createLinearGradient(width * 0.40, 0, width * 0.60, 0);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,1)");

        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, width, height);

        // Right black panel
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(width * 0.55, 0, width * 0.45, height);

        // Text
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.font = "42px sans-serif";

        ctx.fillText(text.slice(0, 100), width * 0.60, height * 0.40);

        ctx.font = "28px sans-serif";
        ctx.fillStyle = "#ccc";
        ctx.fillText(`- ${user.username}`, width * 0.60, height * 0.48);
        ctx.fillStyle = "#777";
        ctx.fillText(`@${user.tag}`, width * 0.60, height * 0.54);

        ctx.fillStyle = "#888";
        ctx.textAlign = "right";
        ctx.font = "22px sans-serif";
        ctx.fillText(client.user.username, width - 20, height - 20);

        return new AttachmentBuilder(canvas.toBuffer("image/png"), {
          name: "quote.png"
        });
      }

      // === NEW MODE (full image, centered text)
      async function renderNew() {
        const width = 1000;
        const height = 1200;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Load avatar full
        let avatar;
        try {
          avatar = await loadImage(
            user.displayAvatarURL({ extension: "png", size: 1024 })
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

        // Heavy vignette bottom
        const fade = ctx.createLinearGradient(0, height * 0.4, 0, height);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,0.93)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, width, height);

        // Center quote text
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "70px sans-serif";
        ctx.fillText(text.slice(0, 140), width / 2, height * 0.62);

        // Underline
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 150, height * 0.67);
        ctx.lineTo(width / 2 + 150, height * 0.67);
        ctx.stroke();

        // Username
        ctx.font = "40px sans-serif";
        ctx.fillStyle = "#ddd";
        ctx.fillText(`- ${user.username}`, width / 2, height * 0.72);

        ctx.font = "32px sans-serif";
        ctx.fillStyle = "#888";
        ctx.fillText(`@${user.tag}`, width / 2, height * 0.77);

        // Watermark
        ctx.textAlign = "right";
        ctx.font = "28px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(client.user.username, width - 40, height - 40);

        return new AttachmentBuilder(canvas.toBuffer("image/png"), {
          name: "quote.png"
        });
      }

      const img = await renderClassic();

      // === BUTTONS ===
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
          .setCustomId(`fog_${state.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:dewpoint:1442266810660683939>"),

        new ButtonBuilder()
          .setCustomId(`glitch_${state.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:glitch:1442266700153360466>"),

        new ButtonBuilder()
          .setCustomId(`switch_${state.id}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji("<:botsun:1442266721397506169>")
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gif_${state.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:gifsquare:1442266831388672162>"),

        new ButtonBuilder()
          .setCustomId(`refresh_${state.id}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:refresh:1442266767564210256>"),

        new ButtonBuilder()
          .setCustomId(`newmode_${state.id}`)
          .setStyle(ButtonStyle.Success)
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

      // === COLLECTOR ===
      const collector = sent.createMessageComponentCollector({
        time: 120000
      });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== message.author.id) {
          return btn.reply({
            content: "❌ Only the creator can use these controls.",
            ephemeral: true
          });
        }

        const [action, id] = btn.customId.split("_");
        if (id !== state.id) return;

        if (action === "trash") {
          collector.stop();
          return sent.delete().catch(() => {});
        }

        if (action === "switch") {
          state.mode = state.mode === "classic" ? "new" : "classic";
        }
        if (action === "newmode") {
          state.mode = "new";
        }

        if (action === "brightness") state.brightness += 0.05;
        if (action === "contrast") state.contrast += 0.1;
        if (action === "fog") state.fog += 0.1;
        if (action === "glitch") state.glitch = !state.glitch;

        const output =
          state.mode === "new"
            ? await renderNew()
            : await renderClassic();

        await btn.update({
          files: [output],
          components: [row1, row2]
        });
      });

      collector.on("end", () => {
        sent.edit({ components: [] }).catch(() => {});
      });
    } catch (e) {
      console.error("Quote error:", e);
      return message.reply("❌ Error executing command.");
    }
  }
};
