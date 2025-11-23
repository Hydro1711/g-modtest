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

// ===========================
// COMMAND 1 — /quotemessage
// ===========================
const slash = new SlashCommandBuilder()
  .setName("quotemessage")
  .setDescription("Heist-style quote generator. Use Apps → Quote Message on a message.");

// ===========================
// COMMAND 2 — Apps → Quote Message
// ===========================
const context = new ContextMenuCommandBuilder()
  .setName("Quote Message")
  .setType(ApplicationCommandType.Message);

// ===========================
// TEXT WRAP HELPER
// ===========================
function wrap(ctx, text, max) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ===========================
// BUTTON UI
// ===========================
function buildUI(state) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`quote_brightness_${state.id}`).setEmoji("<:brightnesscontrol:1442266667508830350>").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`quote_contrast_${state.id}`).setEmoji("<:contrast:1442266851408089250>").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`quote_dew_${state.id}`).setEmoji("<:dewpoint:1442266810660683939>").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`quote_blue_${state.id}`).setEmoji("<:botsun:1442266721397506169>").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`quote_glitch_${state.id}`).setEmoji("<:glitch:1442266700153360466>").setStyle(ButtonStyle.Primary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`quote_gif_${state.id}`).setEmoji("<:gifsquare:1442266831388672162>").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`quote_new_${state.id}`).setEmoji("<:newproduct:1442268874107257025>").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`quote_refresh_${state.id}`).setEmoji("<:refresh:1442266767564210256>").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`quote_trash_${state.id}`).setEmoji("<:trash:1442266748924723274>").setStyle(ButtonStyle.Danger)
    )
  ];
}

// ===========================
// RENDER IMAGE
// ===========================
async function render(state, botUser) {
  const W = 900, H = 1200;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Avatar BG
  try {
    const av = await loadImage(state.user.displayAvatarURL({ extension: "png", size: 512 }));
    const scale = Math.max(W / av.width, H / av.height);
    ctx.drawImage(av, W/2 - av.width*scale/2, H/2 - av.height*scale/2, av.width*scale, av.height*scale);
  } catch {
    ctx.fillStyle = "#000516";
    ctx.fillRect(0,0,W,H);
  }

  // Themes
  if (state.theme === "glitch") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "rgba(0,255,255,0.2)";
    ctx.fillRect(0,H*0.25,W,20);
    ctx.fillStyle = "rgba(255,0,255,0.2)";
    ctx.fillRect(0,H*0.50,W,20);
    ctx.fillStyle = "rgba(255,255,0,0.15)";
    ctx.fillRect(0,H*0.75,W,20);
  } else {
    ctx.fillStyle = "rgba(0,15,40,0.65)";
    ctx.fillRect(0,0,W,H);
  }

  // Text
  let txt = state.text || "No message content.";
  if (txt.length > 300) txt = txt.slice(0,297)+"...";

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  let fontSize = txt.length < 40 ? 64 : txt.length > 140 ? 40 : 52;
  ctx.font = `${fontSize}px sans-serif`;

  const lines = wrap(ctx, txt, W * 0.75);
  const lh = fontSize * 1.25;
  const totalH = lines.length * lh;
  let y = H/2 - totalH/2;

  for (const l of lines) {
    ctx.fillText(l, W/2, y);
    y += lh;
  }

  ctx.fillStyle = "#d6e6ff";
  ctx.font = `${Math.floor(fontSize*0.6)}px sans-serif`;
  ctx.fillText(`– ${state.user.username}`, W/2, y + lh*0.6);

  // Watermark
  ctx.textAlign = "right";
  ctx.font = "26px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(botUser.username, W-30, H-40);

  return new AttachmentBuilder(canvas.toBuffer(), { name: "quote.png" });
}

// ===============================
// EXPORT FOR COMMAND HANDLER
// ===============================
module.exports = {
  // Your handler loads ONE command per file,
  // so we expose .data as slash by default.
  data: slash,

  // But we ALSO expose context so handler can auto-load it as well.
  context,

  async execute(interaction) {
    // Slash → /quotemessage
    if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
      return interaction.reply({
        content: "Use **Apps → Quote Message** on a message to generate the quote.",
        ephemeral: true,
      });
    }

    // Apps → Quote Message
    if (interaction.isMessageContextMenuCommand && interaction.isMessageContextMenuCommand()) {
      if (interaction.commandName !== "Quote Message") return;

      const msg = interaction.targetMessage;
      const user = msg.author;

      const state = {
        id: Date.now().toString(),
        text: msg.content || "",
        user,
        theme: "blue",
      };

      const file = await render(state, interaction.client.user);

      const sent = await interaction.reply({
        files: [file],
        components: buildUI(state),
        fetchReply: true
      });

      const col = sent.createMessageComponentCollector({ time: 120000 });

      col.on("collect", async btn => {
        if (btn.user.id !== interaction.user.id)
          return btn.reply({ content: "Not your quote.", ephemeral: true });

        const [_, action, id] = btn.customId.split("_");
        if (id !== state.id) return;

        if (action === "trash") {
          await sent.delete().catch(()=>{});
          return;
        }

        if (action === "gif") {
          return btn.reply({ content: "GIF mode is not implemented yet.", ephemeral: true });
        }

        if (action === "new") {
          return btn.reply({ content: "Badge button added ✔️", ephemeral: true });
        }

        if (action === "refresh") {
          const newFile = await render(state, interaction.client.user);
          return btn.update({ files: [newFile], components: buildUI(state) });
        }

        if (action === "blue" || action === "glitch") {
          state.theme = action;
        }

        const newFile = await render(state, interaction.client.user);
        return btn.update({ files: [newFile], components: buildUI(state) });
      });

      col.on("end", async () => {
        try { await sent.edit({ components: [] }); } catch {}
      });
    }
  }
};
