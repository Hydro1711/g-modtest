const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");

// context menu builder
module.exports.data = new ContextMenuCommandBuilder()
  .setName("Quote Message")
  .setType(ApplicationCommandType.Message);

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const w of words) {
    const test = current ? current + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else current = test;
  }

  if (current) lines.push(current);
  return lines;
}

function buildButtons(state) {
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

async function render(state, botUser) {
  const w = 900;
  const h = 1200;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  let avatar;
  try {
    avatar = await loadImage(
      state.user.displayAvatarURL({ extension: "png", size: 512 })
    );
  } catch {}

  if (avatar) {
    const scale = Math.max(w / avatar.width, h / avatar.height);
    ctx.drawImage(
      avatar,
      w / 2 - (avatar.width * scale) / 2,
      h / 2 - (avatar.height * scale) / 2,
      avatar.width * scale,
      avatar.height * scale
    );
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }

  if (state.theme === "glitch") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(0,255,255,0.25)";
    ctx.fillRect(0, h * 0.3, w, 20);

    ctx.fillStyle = "rgba(255,0,255,0.25)";
    ctx.fillRect(0, h * 0.5, w, 20);

    ctx.fillStyle = "rgba(255,255,0,0.25)";
    ctx.fillRect(0, h * 0.7, w, 20);
  } else {
    ctx.fillStyle = "rgba(0,20,70,0.6)";
    ctx.fillRect(0, 0, w, h);
  }

  let text = state.text || "";
  text = text.trim();
  if (text.length > 300) text = text.slice(0, 297) + "...";

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";

  let font = 58;
  ctx.font = `${font}px sans-serif`;

  const lines = wrapText(ctx, text, w * 0.7);
  const lh = font * 1.3;
  const blockH = lines.length * lh;

  let y = h / 2 - blockH / 2;

  lines.forEach((l, i) => {
    ctx.fillText(l, w / 2, y + i * lh);
  });

  ctx.font = "36px sans-serif";
  ctx.fillStyle = "#dfe7ff";
  ctx.fillText(`– ${state.user.username}`, w / 2, y + blockH + 60);

  ctx.font = "28px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(botUser.username, w - 40, h - 40);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "quote.png",
  });
}

module.exports.execute = async function (interaction) {
  const msg = interaction.targetMessage;
  const user = msg.author;

  const state = {
    id: Date.now().toString(),
    user,
    text: msg.content,
    theme: "blue",
  };

  const attachment = await render(state, interaction.client.user);

  const reply = await interaction.reply({
    files: [attachment],
    components: buildButtons(state),
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    time: 150000,
  });

  collector.on("collect", async (btn) => {
    if (btn.user.id !== interaction.user.id)
      return btn.reply({
        content: "Not your quote.",
        ephemeral: true,
      });

    const [_, action, id] = btn.customId.split("_");
    if (id !== state.id) return;

    if (action === "trash") {
      collector.stop("del");
      return reply.delete().catch(() => {});
    }

    if (action === "blue") state.theme = "blue";
    if (action === "glitch") state.theme = "glitch";

    if (action === "refresh") {
      const refreshImg = await render(state, interaction.client.user);
      return btn.update({
        files: [refreshImg],
        components: buildButtons(state),
      });
    }

    return btn.reply({
      content: "This button isn't implemented yet (same as Heist).",
      ephemeral: true,
    });
  });

  collector.on("end", () => {
    reply.edit({ components: [] }).catch(() => {});
  });
};
