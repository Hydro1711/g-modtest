/* ----------- DEPENDENCIES ----------- */

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

/* ---------- SLASH COMMAND (/quotemessage) ----------- */

const slashCommand = {
  data: new SlashCommandBuilder()
    .setName("quotemessage")
    .setDescription("Create a Heist-style quote image (use Apps → Quote Message)."),

  async execute(interaction) {
    return interaction.reply({
      content: "Use **Apps → Quote Message** on a message you want to quote.\nDiscord does not send replied messages to slash commands.",
      ephemeral: true,
    });
  }
};

/* ------------- CONTEXT MENU (Apps → Quote Message) ---------- */

const contextCommand = {
  data: new ContextMenuCommandBuilder()
    .setName("Quote Message")
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const targetMessage = interaction.targetMessage;
    const targetUser = targetMessage.author;

    const state = {
      id: Date.now().toString(),
      user: targetUser,
      text: targetMessage.content || "",
      theme: "blue",
    };

    const attachment = await renderQuoteImage(state, interaction.client.user);
    const replyMessage = await interaction.reply({
      files: [attachment],
      components: buildComponents(state),
      fetchReply: true,
      allowedMentions: { parse: [] },
    });

    const collector = replyMessage.createMessageComponentCollector({
      time: 120000,
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({
          content: "Only the creator can use these buttons.",
          ephemeral: true,
        });
      }

      const [prefix, action, id] = btn.customId.split("_");
      if (prefix !== "quote" || id !== state.id) return;

      if (action === "trash") {
        await btn.deferUpdate();
        collector.stop("deleted");
        return replyMessage.delete().catch(() => {});
      }

      if (action === "refresh") {
        const updated = await renderQuoteImage(state, interaction.client.user);
        return btn.update({
          files: [updated],
          components: buildComponents(state),
        });
      }

      if (action === "blue") state.theme = "blue";
      if (action === "glitch") state.theme = "glitch";

      return btn.update({
        files: [await renderQuoteImage(state, interaction.client.user)],
        components: buildComponents(state),
      });
    });

    collector.on("end", () => {
      replyMessage.edit({ components: [] }).catch(() => {});
    });
  }
};

/* ----------- BUTTON UI ---------- */

function buildComponents(state) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_blue_${state.id}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:botsun:1442266721397506169>"),

    new ButtonBuilder()
      .setCustomId(`quote_glitch_${state.id}`)
      .setStyle(ButtonStyle.Primary)
      .setEmoji("<:glitch:1442266700153360466>")
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_refresh_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:refresh:1442266767564210256>"),

    new ButtonBuilder()
      .setCustomId(`quote_new_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:newproduct:1442268874107257025>"),

    new ButtonBuilder()
      .setCustomId(`quote_gif_${state.id}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:gifsquare:1442266831388672162>"),

    new ButtonBuilder()
      .setCustomId(`quote_trash_${state.id}`)
      .setStyle(ButtonStyle.Danger)
      .setEmoji("<:trash:1442266748924723274>")
  );

  return [row1, row2];
}

/* ---------- QUOTE IMAGE RENDER ----------- */

async function renderQuoteImage(state, botUser) {
  const width = 900;
  const height = 1200;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Avatar background
  let avatar;
  try {
    avatar = await loadImage(
      state.user.displayAvatarURL({ extension: "png", size: 512 })
    );
  } catch {}

  if (avatar) {
    const scale = Math.max(width / avatar.width, height / avatar.height);
    const x = width / 2 - (avatar.width * scale) / 2;
    const y = height / 2 - (avatar.height * scale) / 2;
    ctx.drawImage(avatar, x, y, avatar.width * scale, avatar.height * scale);
  }

  // Blue or glitch theme
  if (state.theme === "glitch") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,255,255,0.2)";
    ctx.fillRect(0, height * 0.25, width, 25);
    ctx.fillStyle = "rgba(255,0,255,0.2)";
    ctx.fillRect(0, height * 0.5, width, 25);
    ctx.fillStyle = "rgba(255,255,0,0.2)";
    ctx.fillRect(0, height * 0.75, width, 25);
  } else {
    ctx.fillStyle = "rgba(10,30,80,0.6)";
    ctx.fillRect(0, 0, width, height);
  }

  // Quote text
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "56px sans-serif";
  ctx.fillText(state.text, width / 2, height / 2);

  // Author
  ctx.font = "38px sans-serif";
  ctx.fillText(`– ${state.user.username}`, width / 2, height * 0.62);

  // Watermark
  ctx.textAlign = "right";
  ctx.font = "28px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(botUser.username, width - 40, height - 40);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "quote.png",
  });
}

/* ----------- EXPORT BOTH AS SEPARATE COMMANDS ----------- */

module.exports = { slashCommand, contextCommand };
