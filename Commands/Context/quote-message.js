const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

// ---------------------------------------------
// Proper Export (Your handler REQUIRE this format)
// ---------------------------------------------
module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("Quote Message")
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const msg = interaction.targetMessage;
    const user = msg.author;

    const state = {
      id: Date.now().toString(),
      user,
      text: msg.content || "",
      theme: "blue",
    };

    // Functions below -----------------------------------------------------

    function wrapText(ctx, text, maxWidth) {
      const words = text.split(/\s+/);
      const lines = [];
      let line = "";

      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }

    function buildComponents(state) {
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

    async function renderQuoteImage(state, botUser) {
      const width = 900;
      const height = 1200;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

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
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
      }

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

      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";

      let text = state.text || "No content.";
      if (text.length > 300) text = text.slice(0, 297) + "...";

      let fontSize = 52;
      if (text.length < 40) fontSize = 64;
      if (text.length > 140) fontSize = 40;

      ctx.font = `${fontSize}px sans-serif`;

      const paddingX = width * 0.12;
      const maxWidth = width - paddingX * 2;
      const lines = wrapText(ctx, text, maxWidth);

      const lineHeight = fontSize * 1.3;
      const totalHeight = lines.length * lineHeight;

      let y = height / 2 - totalHeight / 2;
      for (const line of lines) {
        ctx.fillText(line, width / 2, y);
        y += lineHeight;
      }

      ctx.font = `${Math.floor(fontSize * 0.7)}px sans-serif`;
      ctx.fillStyle = "#dfe7ff";
      ctx.fillText(`– ${state.user.username}`, width / 2, y + 40);

      ctx.font = `${Math.floor(fontSize * 0.5)}px sans-serif`;
      ctx.fillText(`@${state.user.tag}`, width / 2, y + 80);

      ctx.font = "28px sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(botUser.username, width - 40, height - 40);

      return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "quote.png",
      });
    }

    // ----------------------------------------------------

    const image = await renderQuoteImage(state, interaction.client.user);

    const sent = await interaction.reply({
      files: [image],
      components: buildComponents(state),
      fetchReply: true,
    });

    const collector = sent.createMessageComponentCollector({
      time: 120000,
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id)
        return btn.reply({
          content: "Only the creator can use these buttons.",
          ephemeral: true,
        });

      const [prefix, action, id] = btn.customId.split("_");
      if (id !== state.id) return;

      if (action === "trash") {
        await btn.deferUpdate();
        collector.stop();
        return sent.delete().catch(() => {});
      }

      if (action === "glitch") state.theme = "glitch";
      if (action === "blue") state.theme = "blue";

      const updated = await renderQuoteImage(state, interaction.client.user);

      return btn.update({
        files: [updated],
        components: buildComponents(state),
      });
    });

    collector.on("end", () => {
      try {
        sent.edit({ components: [] }).catch(() => {});
      } catch {}
    });
  },
};
