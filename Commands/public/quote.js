const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Create a Heist-style quote card (reply to a message!)"),

  async execute(interaction) {
    // Must be replying to a message
    const ref = interaction.options.getMessage("message");
    const replied = interaction.channel.messages.cache.get(interaction.targetId);

    const message =
      interaction.options.getMessage?.("message") ||
      interaction.channel.messages.cache.get(interaction.targetId) ||
      interaction.channel.messages.cache.get(interaction.reference?.messageId);

    if (!interaction.replied && !interaction.deferred) {
      if (!interaction.channel.messages.cache.get(interaction.reference?.messageId)) {
        return interaction.reply({
          content: "❌ **You must reply to the message you want to quote.**",
          ephemeral: true,
        });
      }
    }

    const targetMessage = interaction.channel.messages.cache.get(
      interaction.reference?.messageId
    );
    if (!targetMessage)
      return interaction.reply({
        content: "❌ **You must reply to the message you want to quote.**",
        ephemeral: true,
      });

    const text = targetMessage.content || " ";
    const user = targetMessage.author;

    // DEFAULT STATE
    let theme = "blue"; // blue or glitch
    let brightness = 1;
    let contrast = 1;
    let glitch = false;
    let isGif = false;
    let isNew = false;

    async function render() {
      const width = 900;
      const height = 1100;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Avatar background
      const avatar = await loadImage(
        user.displayAvatarURL({ extension: "png", size: 512 })
      );

      // Draw pfp background
      ctx.drawImage(avatar, 0, 0, width, height);

      // Blue or Glitch overlay
      if (theme === "blue") {
        ctx.fillStyle = "rgba(0, 60, 255, 0.45)";
        ctx.fillRect(0, 0, width, height);
      }

      if (theme === "glitch") {
        ctx.fillStyle = "rgba(255,0,0,0.35)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0,255,255,0.25)";
        ctx.fillRect(30, 0, width, height);
      }

      // Filters
      ctx.filter = `brightness(${brightness}) contrast(${contrast})`;

      // Quote text
      ctx.fillStyle = "#fff";
      ctx.font = "55px sans-serif";
      ctx.textAlign = "center";
      wrap(ctx, text, width / 2, height / 2 - 50, 700, 60);

      // Username
      ctx.font = "40px sans-serif";
      ctx.fillText(`– ${user.username}`, width / 2, height - 180);

      // If NEW toggle is on
      if (isNew) {
        ctx.font = "50px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText("NEW", width - 120, 90);
      }

      return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "quote.png",
      });
    }

    function wrap(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(" ");
      let line = "";
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, x, y);
          line = words[n] + " ";
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, y);
    }

    // BUTTONS w/ YOUR EMOJIS
    const row = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("q_theme")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:botsun:1442266721397506169>"),
        new ButtonBuilder()
          .setCustomId("q_bright")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:brightnesscontrol:1442266667508830350>"),
        new ButtonBuilder()
          .setCustomId("q_contrast")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:contrast:1442266851408089250>"),
        new ButtonBuilder()
          .setCustomId("q_dew")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:dewpoint:1442266810660683939>"),
        new ButtonBuilder()
          .setCustomId("q_delete")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("<:trash:1442266748924723274>")
      );

    const row2 = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("q_glitch")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:glitch:1442266700153360466>"),
        new ButtonBuilder()
          .setCustomId("q_gif")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:gifsquare:1442266831388672162>"),
        new ButtonBuilder()
          .setCustomId("q_new")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:newproduct:1442268874107257025>"),
        new ButtonBuilder()
          .setCustomId("q_refresh")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("<:refresh:1442266767564210256>")
      );

    const attachment = await render();

    const msg = await interaction.reply({
      files: [attachment],
      components: [row(), row2()],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      time: 1000 * 60 * 2,
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== interaction.user.id)
        return btn.reply({
          content: "❌ Only the command user can use these.",
          ephemeral: true,
        });

      switch (btn.customId) {
        case "q_theme":
          theme = theme === "blue" ? "glitch" : "blue";
          break;

        case "q_bright":
          brightness = brightness >= 1.6 ? 1 : brightness + 0.2;
          break;

        case "q_contrast":
          contrast = contrast >= 1.8 ? 1 : contrast + 0.2;
          break;

        case "q_dew":
          brightness = 0.8;
          contrast = 1.4;
          break;

        case "q_glitch":
          theme = "glitch";
          glitch = true;
          break;

        case "q_gif":
          isGif = !isGif;
          break;

        case "q_new":
          isNew = !isNew;
          break;

        case "q_refresh":
          brightness = 1;
          contrast = 1;
          glitch = false;
          isNew = false;
          theme = "blue";
          break;

        case "q_delete":
          collector.stop();
          return msg.delete().catch(() => {});
      }

      const newImg = await render();
      await btn.update({
        files: [newImg],
        components: [row(), row2()],
      });
    });

    collector.on("end", () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
