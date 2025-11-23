const {
    SlashCommandBuilder,
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

const { createCanvas, loadImage } = require("canvas");

// ======================================================
//   SLASH COMMAND  (/quotemessage)
// ======================================================
module.exports.slash = {
    data: new SlashCommandBuilder()
        .setName("quotemessage")
        .setDescription("Use Apps → Quote Message on any message"),

    async execute(interaction) {
        return interaction.reply({
            content: "Use **Apps → Quote Message** on the message you want to quote.",
            ephemeral: true
        });
    }
};

// ======================================================
//   CONTEXT MENU  (Apps → Quote Message)
// ======================================================
module.exports.context = {
    data: new ContextMenuCommandBuilder()
        .setName("Quote Message")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const targetMessage = interaction.targetMessage;
        const targetUser = targetMessage.author;

        const state = {
            id: Date.now().toString(),
            user: targetUser,
            text: targetMessage.content || "",
            theme: "blue"
        };

        const attachment = await renderQuote(state, interaction.client.user);

        const msg = await interaction.reply({
            files: [attachment],
            components: buildUI(state),
            fetchReply: true,
            allowedMentions: { parse: [] }
        });

        const collector = msg.createMessageComponentCollector({
            time: 2 * 60 * 1000
        });

        collector.on("collect", async btn => {
            if (btn.user.id !== interaction.user.id) {
                return btn.reply({
                    content: "Only the creator can use these buttons.",
                    ephemeral: true
                });
            }

            const [prefix, action, id] = btn.customId.split("_");
            if (prefix !== "quote" || id !== state.id) return;

            if (action === "trash") {
                await btn.deferUpdate();
                collector.stop("deleted");
                return msg.delete().catch(() => {});
            }

            if (action === "refresh") {
                const updated = await renderQuote(state, interaction.client.user);
                return btn.update({ files: [updated], components: buildUI(state) });
            }

            if (action === "blue") state.theme = "blue";
            if (action === "glitch") state.theme = "glitch";

            // non-functional cosmetic buttons
            if (["dew", "gif", "contrast", "brightness", "new"].includes(action)) {
                return btn.reply({
                    content: "UI only — matching Heist's layout.",
                    ephemeral: true
                });
            }

            const newImage = await renderQuote(state, interaction.client.user);
            return btn.update({ files: [newImage], components: buildUI(state) });
        });

        collector.on("end", async (c, r) => {
            if (r === "deleted") return;
            try {
                await msg.edit({ components: [] });
            } catch {}
        });
    }
};

// ======================================================
//   UI BUTTONS  (your emojis)
// ======================================================
function buildUI(state) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`quote_brightness_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:brightnesscontrol:1442266667508830350>"),
        new ButtonBuilder().setCustomId(`quote_contrast_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:contrast:1442266851408089250>"),
        new ButtonBuilder().setCustomId(`quote_dew_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:dewpoint:1442266810660683939>"),
        new ButtonBuilder().setCustomId(`quote_blue_${state.id}`).setStyle(ButtonStyle.Primary).setEmoji("<:botsun:1442266721397506169>"),
        new ButtonBuilder().setCustomId(`quote_glitch_${state.id}`).setStyle(ButtonStyle.Primary).setEmoji("<:glitch:1442266700153360466>")
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`quote_gif_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:gifsquare:1442266831388672162>"),
        new ButtonBuilder().setCustomId(`quote_new_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:newproduct:1442268874107257025>"),
        new ButtonBuilder().setCustomId(`quote_refresh_${state.id}`).setStyle(ButtonStyle.Secondary).setEmoji("<:refresh:1442266767564210256>"),
        new ButtonBuilder().setCustomId(`quote_trash_${state.id}`).setStyle(ButtonStyle.Danger).setEmoji("<:trash:1442266748924723274>")
    );

    return [row1, row2];
}

// ======================================================
//   RENDER QUOTE  (blue + glitch themes)
// ======================================================
async function renderQuote(state, bot) {
    const width = 900;
    const height = 1100;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // avatar bg
    try {
        const avatar = await loadImage(
            state.user.displayAvatarURL({ extension: "png", size: 512 })
        );
        const scale = Math.max(width / avatar.width, height / avatar.height);
        const x = width / 2 - (avatar.width * scale) / 2;
        const y = height / 2 - (avatar.height * scale) / 2;
        ctx.drawImage(avatar, x, y, avatar.width * scale, avatar.height * scale);
    } catch {
        ctx.fillStyle = "#00051a";
        ctx.fillRect(0, 0, width, height);
    }

    // theme
    if (state.theme === "glitch") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(0,255,255,0.2)";
        ctx.fillRect(0, 300, width, 20);

        ctx.fillStyle = "rgba(255,0,255,0.2)";
        ctx.fillRect(0, 550, width, 20);
    } else {
        ctx.fillStyle = "rgba(5,15,50,0.6)";
        ctx.fillRect(0, 0, width, height);
    }

    // text
    const text = state.text.slice(0, 300);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "54px sans-serif";

    const lines = wrap(ctx, text, width * 0.7);
    const lh = 70;
    const total = lines.length * lh;
    let y = height / 2 - total / 2;

    for (const line of lines) {
        ctx.fillText(line, width / 2, y);
        y += lh;
    }

    ctx.font = "32px sans-serif";
    ctx.fillStyle = "#dfe7ff";
    ctx.fillText(`– ${state.user.username}`, width / 2, y + 40);

    ctx.font = "26px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(bot.username, width - 40, height - 40);

    return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "quote.png" });
}

// simple wrap
function wrap(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
        const test = line + w + " ";
        if (ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = w + " ";
        } else line = test;
    }
    lines.push(line);
    return lines;
}
