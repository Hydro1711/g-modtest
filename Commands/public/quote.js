// src/Commands/Fun/quote.js

const {
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

// -------------------- text wrapping helper --------------------
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? current + " " + word : word;
    const width = ctx.measureText(test).width;
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// -------------------- buttons (Heist-style UI) --------------------
function buildComponents(state) {
  // Row 1
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_brightness_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:brightnesscontrol:1442266667508830350>"),

    new ButtonBuilder()
      .setCustomId(`quote_contrast_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:contrast:1442266851408089250>`"),

    new ButtonBuilder()
      .setCustomId(`quote_dew_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:dewpoint:1442266810660683939>`"),

    new ButtonBuilder()
      .setCustomId(`quote_blue_${state.id}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:botsun:1442266721397506169>`"),

    new ButtonBuilder()
      .setCustomId(`quote_glitch_${state.id}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:glitch:1442266700153360466>`")
  );

  // Row 2
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_gif_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:gifsquare:1442266831388672162>`"),

    new ButtonBuilder()
      .setCustomId(`quote_new_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:newproduct:1442268874107257025>`"),

    new ButtonBuilder()
      .setCustomId(`quote_refresh_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:refresh:1442266767564210256>`"),

    new ButtonBuilder()
      .setCustomId(`quote_trash_${state.id}`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji("<:trash:1442266748924723274>`")
  );

  return [row1, row2];
}

// -------------------- canvas renderer --------------------
async function renderQuoteImage(state, botUser) {
  const width = 900;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1) Background = user's avatar
  let avatar = null;
  try {
    avatar = await loadImage(
      state.user.displayAvatarURL({ extension: "png", size: 512 })
    );
  } catch (e) {
    avatar = null;
  }

  if (avatar) {
    const scale = Math.max(width / avatar.width, height / avatar.height);
    const x = width / 2 - (avatar.width * scale) / 2;
    const y = height / 2 - (avatar.height * scale) / 2;
    ctx.drawImage(avatar, x, y, avatar.width * scale, avatar.height * scale);
  } else {
    ctx.fillStyle = "#00051a";
    ctx.fillRect(0, 0, width, height);
  }

  // 2) Theme overlay
  if (state.theme === "glitch") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(0,255,255,0.25)";
    ctx.fillRect(0, height * 0.25, width, 20);
    ctx.fillStyle = "rgba(255,0,255,0.25)";
    ctx.fillRect(0, height * 0.5, width, 20);
    ctx.fillStyle = "rgba(255,255,0,0.2)";
    ctx.fillRect(0, height * 0.75, width, 20);
  } else {
    ctx.fillStyle = "rgba(5, 15, 50, 0.7)";
    ctx.fillRect(0, 0, width, height);
  }

  // 3) Quote text
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";

  let text = state.text || "No content.";
  text = text.trim();
  if (text.length > 300) text = text.slice(0, 297) + "...";

  let fontSize = 52;
  if (text.length < 40) fontSize = 64;
  if (text.length > 140) fontSize = 40;

  ctx.font = `${fontSize}px sans-serif`;

  const paddingX = width * 0.12;
  const maxTextWidth = width - paddingX * 2;
  const lines = wrapText(ctx, text, maxTextWidth);

  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight;
  let startY = height / 2 - blockHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  // 4) Author / tag
  const authorTag = state.user.tag || state.user.username;
  const afterTextY = startY + blockHeight;

  ctx.font = `${Math.floor(fontSize * 0.7)}px sans-serif`;
  ctx.fillStyle = "#dfe7ff";
  ctx.fillText(`– ${state.user.username}`, width / 2, afterTextY + lineHeight * 0.8);

  ctx.font = `${Math.floor(fontSize * 0.5)}px sans-serif`;
  ctx.fillStyle = "rgba(223,231,255,0.8)";
  ctx.fillText(`@${authorTag}`, width / 2, afterTextY + lineHeight * 1.5);

  // 5) Watermark bottom-right
  ctx.font = "28px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(botUser.username, width - 40, height - 40);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "quote.png",
  });
}

// -------------------- PREFIX COMMAND EXPORT --------------------
module.exports = {
  name: "quote",
  description: "Create a Heist-style quote image from a replied message.",
  aliases: [], // add ["hq", "qquote"] etc if your handler supports it

  /**
   * Prefix command handler
   * Usage: reply to a message and type: mod!quote
   */
  async execute(message, args, client) {
    // Must be used as a reply to a message
    if (!message.reference || !message.reference.messageId) {
      return message.reply({
        content: "Reply to the message you want to quote and run `mod!quote`.",
      });
    }

    // Fetch the replied message
    let targetMessage;
    try {
      targetMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );
    } catch (err) {
      console.error("Failed to fetch target message for quote:", err);
      return message.reply({
        content: "I couldn't fetch that message. Try again.",
      });
    }

    const targetUser = targetMessage.author;

    const state = {
      id: message.id,           // unique per command use
      user: targetUser,
      text: targetMessage.content || "",
      theme: "blue",            // "blue" or "glitch"
    };

    const botUser = client?.user || message.client.user;

    // Generate first image
    const attachment = await renderQuoteImage(state, botUser);

    const sent = await message.channel.send({
      files: [attachment],
      components: buildComponents(state),
      allowedMentions: { parse: [] },
    });

    // Button collector (still interactions, but not app commands)
    const collector = sent.createMessageComponentCollector({
      time: 2 * 60 * 1000, // 2 minutes
    });

    collector.on("collect", async (btn) => {
      // Only allow the user who ran mod!quote
      if (btn.user.id !== message.author.id) {
        return btn.reply({
          content: "Only the user who created this quote can use these buttons.",
          ephemeral: true,
        });
      }

      const [prefix, action, id] = btn.customId.split("_");
      if (prefix !== "quote" || id !== state.id) return;

      // cosmetic / not implemented controls
      if (["brightness", "contrast", "dew"].includes(action)) {
        return btn.reply({
          content: "That control isn’t available yet, but the UI matches Heist’s.",
          ephemeral: true,
        });
      }

      if (action === "gif") {
        return btn.reply({
          content: "GIF mode is not implemented (Discord GIF rendering from canvas is non-trivial).",
          ephemeral: true,
        });
      }

      if (action === "new") {
        return btn.reply({
          content: "This is just a badge button for now – looks clean though. 😎",
          ephemeral: true,
        });
      }

      if (action === "trash") {
        await btn.deferUpdate();
        collector.stop("deleted");
        return sent.delete().catch(() => {});
      }

      if (action === "refresh") {
        const newAttachment = await renderQuoteImage(state, botUser);
        return btn.update({
          files: [newAttachment],
          components: buildComponents(state),
        });
      }

      if (action === "blue") state.theme = "blue";
      if (action === "glitch") state.theme = "glitch";

      const newAttachment = await renderQuoteImage(state, botUser);

      return btn.update({
        files: [newAttachment],
        components: buildComponents(state),
      });
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "deleted") return;
      try {
        await sent.edit({ components: [] });
      } catch {
        // ignore
      }
    });
  },
};
