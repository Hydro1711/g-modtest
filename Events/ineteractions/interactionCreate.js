const { 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const Poll = require("../../Schemas/poll");
const ShopItem = require("../../models/ShopItem");
const User = require("../../models/user");

// SHOP CONSTANTS
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

// ----------------------------------------------------------
// SHOP HELPERS (SAFE VERSION)
// ----------------------------------------------------------

function buildBuyRows(items) {
    if (!items || items.length === 0) return [];

    const buttons = items.map(item =>
        new ButtonBuilder()
            .setCustomId(`shop_buy:${item.itemId}`)
            .setLabel(item.name.slice(0, 20))
            .setStyle(ButtonStyle.Success)
            .setDisabled(item.maxStock > 0 && item.stock <= 0)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const slice = buttons.slice(i, i + 5);
        if (slice.length > 0) rows.push(new ActionRowBuilder().addComponents(slice));
    }

    return rows;
}

function buildCategorySelect(selected) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("shop_category")
            .setPlaceholder("Select category")
            .addOptions(
                Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
                    label,
                    value,
                    default: value === selected
                }))
            )
    );
}

function buildNavRow(category, page, maxPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_prev:${category}:${page}`)
            .setLabel("Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),

        new ButtonBuilder()
            .setCustomId(`shop_page_display`)
            .setLabel(`Page ${page}/${maxPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),

        new ButtonBuilder()
            .setCustomId(`shop_next:${category}:${page}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= maxPages)
    );
}

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
        embed.addFields({ name: "No Items", value: "This category has no items." });
        return embed;
    }

    for (const item of items) {
        const price = item.getCurrentPrice ? item.getCurrentPrice() : item.basePrice;
        const stock = item.maxStock > 0 ? `${item.stock}/${item.maxStock}` : "Unlimited";

        embed.addFields({
            name: `${item.emoji || "🧩"} ${item.name}`,
            value:
                `${item.description}\n` +
                `💰 **Price:** \`${price.toLocaleString()} chips\`\n` +
                `⭐ **Rarity:** ${item.rarity}\n` +
                `📦 **Stock:** ${stock}`
        });
    }

    return embed;
}

async function fetchPage(category, page) {
    const q = category === "all" ? {} : { category };

    const total = await ShopItem.countDocuments(q);
    const maxPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.max(1, Math.min(page, maxPages));

    const items = await ShopItem.find(q)
        .sort({ sortOrder: 1, basePrice: 1 })
        .skip((safePage - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);

    return { items, page: safePage, maxPages };
}


// ==========================================================
// MAIN HANDLER
// ==========================================================

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        // Polls – unchanged
        // ... (your full poll logic stays untouched)

        // ----------------------------------------------------
        // SHOP CATEGORY SELECT
        // ----------------------------------------------------
        if (interaction.isStringSelectMenu() && interaction.customId === "shop_category") {
            const category = interaction.values[0];

            const { items, page, maxPages } = await fetchPage(category, 1);

            return interaction.update({
                embeds: [buildShopEmbed(items, category, page, maxPages)],
                components: [
                    buildCategorySelect(category),
                    buildNavRow(category, page, maxPages),
                    ...buildBuyRows(items)
                ]
            });
        }

        // ----------------------------------------------------
        // SHOP PAGE BUTTONS
        // ----------------------------------------------------
        if (interaction.isButton() && interaction.customId.startsWith("shop_prev:")) {
            const [, category, pageStr] = interaction.customId.split(":");
            const page = parseInt(pageStr) - 1;

            const { items, page: newPage, maxPages } = await fetchPage(category, page);

            return interaction.update({
                embeds: [buildShopEmbed(items, category, newPage, maxPages)],
                components: [
                    buildCategorySelect(category),
                    buildNavRow(category, newPage, maxPages),
                    ...buildBuyRows(items)
                ]
            });
        }

        if (interaction.isButton() && interaction.customId.startsWith("shop_next:")) {
            const [, category, pageStr] = interaction.customId.split(":");
            const page = parseInt(pageStr) + 1;

            const { items, page: newPage, maxPages } = await fetchPage(category, page);

            return interaction.update({
                embeds: [buildShopEmbed(items, category, newPage, maxPages)],
                components: [
                    buildCategorySelect(category),
                    buildNavRow(category, newPage, maxPages),
                    ...buildBuyRows(items)
                ]
            });
        }

        // ----------------------------------------------------
        // SHOP BUY BUTTON
        // ----------------------------------------------------
        if (interaction.isButton() && interaction.customId.startsWith("shop_buy:")) {
            const itemId = interaction.customId.split(":")[1];

            const item = await ShopItem.findOne({ itemId });
            if (!item)
                return interaction.reply({ content: "❌ Item not found.", ephemeral: true });

            const user = await User.findOne({ userId: interaction.user.id }) ||
                await User.create({ userId: interaction.user.id });

            const price = item.getCurrentPrice ? item.getCurrentPrice() : item.basePrice;

            if (user.chips < price)
                return interaction.reply({
                    content: `❌ You need \`${price.toLocaleString()} chips\`.`,
                    ephemeral: true
                });

            user.chips -= price;

            const inv = user.items.find(i => i.itemId === itemId);
            if (inv) inv.amount++;
            else user.items.push({ itemId, amount: 1 });

            if (item.maxStock > 0) item.stock--;

            if (item.dynamicPricing)
                item.demandIndex = Math.min(item.demandIndex + 0.01, 1);

            await user.save();
            await item.save();

            return interaction.reply({
                content: `✅ Bought **${item.name}** for \`${price.toLocaleString()} chips\`!`,
                ephemeral: true
            });
        }
    }
};
