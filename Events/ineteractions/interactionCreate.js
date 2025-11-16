const { 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const Poll = require("../../Schemas/poll");
const ShopItem = require("../../Schemas/ShopItem"); // update path as needed
const User = require("../../Schemas/User");         // update path as needed

// SHOP HELPERS
const ITEMS_PER_PAGE = 5;

const CATEGORY_LABELS = {
    all: "All Items",
    boost: "Boosts",
    upgrade: "Upgrades",
    case: "Cases",
    cosmetic: "Cosmetics",
    special: "Special",
    utility: "Utility"
};

const RARITY_COLORS = {
    common: 0x9ca3af,
    uncommon: 0x22c55e,
    rare: 0x3b82f6,
    epic: 0xa855f7,
    legendary: 0xf59e0b,
    mythic: 0xec4899
};

// Build shop item page embed
function buildShopEmbed(items, category, page, maxPages) {
    const embed = new EmbedBuilder()
        .setTitle("🏪 Advanced Chip Shop")
        .setDescription(
            `Category: **${CATEGORY_LABELS[category]}**\n` +
            `Page: **${page}/${maxPages}**`
        )
        .setColor(RARITY_COLORS[items[0]?.rarity || "common"])
        .setTimestamp();

    if (items.length === 0) {
        embed.addFields({
            name: "No items",
            value: "This category is empty."
        });
        return embed;
    }

    for (const item of items) {
        const price = item.dynamicPricing
            ? item.basePrice + Math.round(item.basePrice * item.demandIndex)
            : item.basePrice;

        embed.addFields({
            name: `${item.emoji} ${item.name}`,
            value:
                `${item.description}\n\n` +
                `💰 **Price:** \`${price.toLocaleString()} chips\`\n` +
                `⭐ **Rarity:** ${item.rarity}\n` +
                `📦 **Stock:** ${item.maxStock > 0 ? `${item.stock}/${item.maxStock}` : "Unlimited"}\n`
        });
    }

    return embed;
}

// Fetch shop page
async function fetchPage(category, page) {
    const query = category === "all" ? {} : { category };

    const total = await ShopItem.countDocuments(query);
    const maxPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.max(1, Math.min(maxPages, page));

    const items = await ShopItem.find(query)
        .sort({ sortOrder: 1, basePrice: 1 })
        .skip((safePage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);

    return { items, page: safePage, maxPages };
}

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        // --------------------------------------------
        // 🔹 NON-BUTTON INTERACTIONS
        // --------------------------------------------
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        // ==========================================================
        // 📌 POLL SYSTEM (your original system – untouched)
        // ==========================================================
        if (interaction.isButton()) {
            const [type, action, value] = interaction.customId.split("_");
            if (type === "poll") {
                const poll = await Poll.findOne({ messageId: interaction.message.id });
                if (!poll || poll.ended) {
                    return interaction.reply({ content: "❌ This poll has ended.", ephemeral: true });
                }

                // End poll
                if (action === "end") {
                    if (!interaction.member.permissions.has("ManageRoles")) {
                        return interaction.reply({ content: "❌ Only users with **Manage Roles** can end polls.", ephemeral: true });
                    }

                    poll.ended = true;
                    await poll.save();

                    const results = {};
                    for (const opt of poll.options) results[opt] = 0;
                    for (const [, vote] of poll.votes) results[poll.options[vote]]++;

                    let resultText = "";
                    for (const [opt, count] of Object.entries(results)) {
                        resultText += `**${opt}** — ${count} votes\n`;
                    }

                    const endedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor("Red")
                        .setFooter({ text: "Poll ended" })
                        .setDescription(`${poll.question}\n\nResults:\n${resultText}`);

                    return interaction.update({
                        embeds: [endedEmbed],
                        components: []
                    });
                }

                // Cast vote
                const optionIndex = parseInt(action);
                if (!isNaN(optionIndex)) {
                    if (!poll.votes) poll.votes = new Map();
                    poll.votes.set(interaction.user.id, optionIndex);
                    await poll.save();

                    const results = {};
                    for (const opt of poll.options) results[opt] = 0;
                    for (const [, vote] of poll.votes) results[poll.options[vote]]++;

                    let resultText = "";
                    for (const [opt, count] of Object.entries(results)) {
                        resultText += `**${opt}** — ${count} votes\n`;
                    }

                    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setDescription(`${poll.question}\n\nResults:\n${resultText}`)
                        .setColor("Blue")
                        .setFooter({ text: "Poll is ongoing" });

                    await interaction.update({ embeds: [updatedEmbed] });
                    return interaction.followUp({ content: `✅ You voted **${poll.options[optionIndex]}**`, ephemeral: true });
                }
            }
        }

        // ==========================================================
        // 🏪 SHOP SYSTEM (new)
        // ==========================================================

        // --------------------------------------------
        // CATEGORY SELECT MENU
        // --------------------------------------------
        if (interaction.isStringSelectMenu() && interaction.customId === "shop_category_select") {
            const category = interaction.values[0];
            const { items, page, maxPages } = await fetchPage(category, 1);

            const embed = buildShopEmbed(items, category, page, maxPages);

            const nav = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_prev_${category}_${page}`)
                    .setLabel("Prev")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`shop_next_${category}_${page}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Secondary)
            );

            const select = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("shop_category_select")
                    .setPlaceholder("Select category")
                    .addOptions(
                        Object.keys(CATEGORY_LABELS).map(key => ({
                            label: CATEGORY_LABELS[key],
                            value: key,
                            default: key === category
                        }))
                    )
            );

            const buyRow = new ActionRowBuilder().addComponents(
                ...items.map(item =>
                    new ButtonBuilder()
                        .setCustomId(`shop_buy_${item.itemId}`)
                        .setLabel(`Buy ${item.name}`)
                        .setStyle(ButtonStyle.Success)
                )
            );

            return interaction.update({
                embeds: [embed],
                components: [select, nav, buyRow]
            });
        }

        // --------------------------------------------
        // NEXT/PREV PAGE
        // --------------------------------------------
        if (interaction.isButton() && interaction.customId.startsWith("shop_prev_") || interaction.customId.startsWith("shop_next_")) {
            const [type, direction, category, pageStr] = interaction.customId.split("_");
            const currentPage = parseInt(pageStr);

            const newPage = direction === "prev" ? currentPage - 1 : currentPage + 1;

            const { items, page, maxPages } = await fetchPage(category, newPage);
            const embed = buildShopEmbed(items, category, page, maxPages);

            const nav = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`shop_prev_${category}_${page}`)
                    .setLabel("Prev")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`shop_next_${category}_${page}`)
                    .setLabel("Next")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= maxPages)
            );

            const select = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("shop_category_select")
                    .addOptions(
                        Object.keys(CATEGORY_LABELS).map(key => ({
                            label: CATEGORY_LABELS[key],
                            value: key,
                            default: key === category
                        }))
                    )
            );

            const buyRow = new ActionRowBuilder().addComponents(
                ...items.map(item =>
                    new ButtonBuilder()
                        .setCustomId(`shop_buy_${item.itemId}`)
                        .setLabel(`Buy ${item.name}`)
                        .setStyle(ButtonStyle.Success)
                )
            );

            return interaction.update({
                embeds: [embed],
                components: [select, nav, buyRow]
            });
        }

        // --------------------------------------------
        // BUY BUTTON
        // --------------------------------------------
        if (interaction.isButton() && interaction.customId.startsWith("shop_buy_")) {
            const itemId = interaction.customId.replace("shop_buy_", "");

            const item = await ShopItem.findOne({ itemId });
            if (!item) return interaction.reply({ content: "❌ Item not found.", ephemeral: true });

            const userDoc = await User.findOne({ userId: interaction.user.id }) || await User.create({
                userId: interaction.user.id,
                chips: 0,
                inventory: []
            });

            const price = item.dynamicPricing
                ? item.basePrice + Math.round(item.basePrice * item.demandIndex)
                : item.basePrice;

            if (userDoc.chips < price) {
                return interaction.reply({
                    content: `❌ Not enough chips. You need \`${price.toLocaleString()} chips\`.`,
                    ephemeral: true
                });
            }

            // deduct chips
            userDoc.chips -= price;

            // add item to inventory
            const inv = userDoc.inventory.find(i => i.itemId === itemId);
            if (inv) inv.quantity += 1;
            else userDoc.inventory.push({ itemId, quantity: 1 });

            // update stock
            if (item.maxStock > 0) item.stock -= 1;

            // dynamic pricing demand increase
            if (item.dynamicPricing) {
                item.demandIndex = Math.min(item.demandIndex + 0.01, 1);
            }

            await userDoc.save();
            await item.save();

            return interaction.reply({
                content: `✅ Bought **${item.name}** for \`${price.toLocaleString()} chips\`!`,
                ephemeral: true
            });
        }
    }
};
