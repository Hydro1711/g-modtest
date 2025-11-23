const {
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

// ✅ Slash command: /quotemessage
const slashCommand = new SlashCommandBuilder()
  .setName("quotemessage")
  .setDescription("Create a Heist-style quote image (use Apps → Quote Message).");

// ✅ Message context menu: Apps → Quote Message
const contextCommand = new ContextMenuCommandBuilder()
  .setName("Quote Message")
  .setType(ApplicationCommandType.Message);

// Helper: wrap text for canvas
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

// Helper: build components (all your buttons)
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
      .setEmoji("<:contrast:1442266851408089250>"),
    new ButtonBuilder()
      .setCustomId(`quote_dew_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:dewpoint:1442266810660683939>"),
    new ButtonBuilder()
      .setCustomId(`quote_blue_${state.id}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:botsun:1442266721397506169>"),
    new ButtonBuilder()
      .setCustomId(`quote_glitch_${state.id}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:glitch:1442266700153360466>")
  );

  // Row 2
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_gif_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:gifsquare:1442266831388672162>"),
    new ButtonBuilder()
      .setCustomId(`quote_new_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:newproduct:1442268874107257025>"),
    new ButtonBuilder()
      .setCustomId(`quote_refresh_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:refresh:1442266767564210256>"),
    new ButtonBuilder()
      .setCustomId(`quote_trash_${state.id}`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji("<:trash:1442266748924723274>")
  );

  return [row1, row2];
}

// Render the quote image (blue / glitch theme, avatar bg, watermark = bot name)
async function renderQuoteImage(state, botUser) {
  const width = 900;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 1) Background: user's avatar
  let avatar;
  try {
    avatar = await loadImage(
      state.user.displayAvatarURL({ extension: "png", size: 512 })
    );
  } catch {
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
    // dark base
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, width, height);

    // "glitchy" bars
    ctx.fillStyle = "rgba(0,255,255,0.25)";
    ctx.fillRect(0, height * 0.25, width, 20);
    ctx.fillStyle = "rgba(255,0,255,0.25)";
    ctx.fillRect(0, height * 0.5, width, 20);
    ctx.fillStyle = "rgba(255,255,0,0.2)";
    ctx.fillRect(0, height * 0.75, width, 20);
  } else {
    // default blue theme
    ctx.fillStyle = "rgba(5, 15, 50, 0.7)";
    ctx.fillRect(0, 0, width, height);
  }

  // 3) Quote text
  const paddingX = width * 0.12;
  const maxTextWidth = width - paddingX * 2;

  let text = state.text || "No content.";
  text = text.trim();
  if (text.length > 300) text = text.slice(0, 297) + "...";

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";

  let fontSize = 52;
  if (text.length < 40) fontSize = 64;
  if (text.length > 140) fontSize = 40;

  ctx.font = `${fontSize}px sans-serif`;
  const lines = wrapText(ctx, text, maxTextWidth);
  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight;

  let startY = height / 2 - blockHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  // 4) Author text
  const authorTag = state.user.tag || `${state.user.username}`;
  ctx.font = `${Math.floor(fontSize * 0.7)}px sans-serif`;
  ctx.fillStyle = "#dfe7ff";
  ctx.fillText(`– ${state.user.username}`, width / 2, startY + blockHeight + lineHeight * 0.8);
  ctx.font = `${Math.floor(fontSize * 0.5)}px sans-serif`;
  ctx.fillStyle = "rgba(223,231,255,0.8)";
  ctx.fillText(`@${authorTag}`, width / 2, startY + blockHeight + lineHeight * 1.5);

  // 5) Watermark (bot name) bottom-right
  const watermark = botUser.username;
  ctx.font = "28px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(watermark, width - 40, height - 40);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "quote.png",
  });
}

module.exports = {
  // ⚠️ Your command handler might expect ONE .data.
  // If it doesn't support arrays, either:
  //  - change it to handle this array, OR
  //  - split slash/context into two files.
  data: [slashCommand, contextCommand],

  // expose separately just in case you need them
  slashCommand,
  contextCommand,

  /**
   * Main execute handler.
   * - Slash: /quotemessage → tells user to use Apps
   * - Context Menu: Quote Message → real Heist-style quote
   */
  async execute(interaction) {
    // ✅ Slash command behaviour
    if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
      if (interaction.commandName === "quotemessage") {
        // Discord does NOT give "replied message" to slash commands.
        // Real Heist-style quoting is done via message Apps.
        return interaction.reply({
          content:
            "Use **Apps → Quote Message** on the message you want to quote.\n(Discord doesn’t send the replied message to slash commands.)",
          ephemeral: true,
        });
      }
      return;
    }

    // ✅ Message context menu Apps → Quote Message
    if (interaction.isMessageContextMenuCommand && interaction.isMessageContextMenuCommand()) {
      if (interaction.commandName !== "Quote Message") return;

      const targetMessage = interaction.targetMessage;
      const targetUser = targetMessage.author;

      const state = {
        id: Date.now().toString(),
        user: targetUser,
        text: targetMessage.content || "",
        theme: "blue", // "blue" or "glitch"
      };

      const attachment = await renderQuoteImage(state, interaction.client.user);

      const replyMessage = await interaction.reply({
        files: [attachment],
        components: buildComponents(state),
        fetchReply: true,
        allowedMentions: { parse: [] },
      });

      const collector = replyMessage.createMessageComponentCollector({
        time: 2 * 60 * 1000, // 2 minutes
      });

      collector.on("collect", async (btn) => {
        // Only the person who used the app can press buttons
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({
            content: "Only the user who created this quote can use these buttons.",
            ephemeral: true,
          });
        }

        const [prefix, action, id] = btn.customId.split("_");
        if (prefix !== "quote" || id !== state.id) return;

        // Cosmetic / coming-soon buttons
        if (action === "brightness" || action === "contrast" || action === "dew") {
          return btn.reply({
            content: "That control isn’t available yet, but the UI is here like Heist’s.",
            ephemeral: true,
          });
        }

        if (action === "gif") {
          return btn.reply({
            content: "GIF mode is not implemented yet (Discord canvas GIF encoding is non-trivial).",
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
          return replyMessage.delete().catch(() => {});
        }

        if (action === "refresh") {
          // Just re-render current theme
          const newAttachment = await renderQuoteImage(state, interaction.client.user);
          return btn.update({
            files: [newAttachment],
            components: buildComponents(state),
          });
        }

        if (action === "blue") {
          state.theme = "blue";
        }

        if (action === "glitch") {
          state.theme = "glitch";
        }

        const newAttachment = await renderQuoteImage(state, interaction.client.user);

        await btn.update({
          files: [newAttachment],
          components: buildComponents(state),
        });
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "deleted") return;
        try {
          await replyMessage.edit({ components: [] });
        } catch {
          // ignore
        }
      });

      return;
    }
  },
};
