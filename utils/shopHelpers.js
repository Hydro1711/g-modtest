// utils/shopHelpers.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const ShopItem = require('../models/ShopItem');

const ITEMS_PER_PAGE = 5;

const CATEGORY_LABELS = {
  all: 'All Items',
  boost: 'Boosts',
  upgrade: 'Upgrades',
  case: 'Cases',
  cosmetic: 'Cosmetics',
  special: 'Special',
  utility: 'Utility'
};

const RARITY_COLORS = {
  common: 0x9ca3af,
  uncommon: 0x22c55e,
  rare: 0x3b82f6,
  epic: 0xa855f7,
  legendary: 0xf59e0b,
  mythic: 0xec4899
};

function buildShopEmbed(user, items, category, page, maxPages) {
  const embed = new EmbedBuilder()
    .setTitle(`🏪 Advanced Chip Shop`)
    .setDescription(
      `Browse and buy items using your **casino chips**.\n` +
      `Category: **${CATEGORY_LABELS[category] || 'All Items'}**\n` +
      `Page: **${page}/${maxPages || 1}**`
    )
    .setFooter({ text: `Use the buttons & dropdown to navigate.` })
    .setTimestamp();

  const colorRarity = items[0]?.rarity || 'common';
  embed.setColor(RARITY_COLORS[colorRarity] || 0xffffff);

  if (items.length === 0) {
    embed.addFields({
      name: 'No items here',
      value: 'Try a different category.'
    });
    return embed;
  }

  for (const item of items) {
    const price = item.getCurrentPrice ? item.getCurrentPrice() : item.basePrice;
    let value = `**Price:** \`${price.toLocaleString()} chips\`\n` +
                `**Rarity:** \`${item.rarity}\`\n` +
                `**Category:** \`${CATEGORY_LABELS[item.category] || item.category}\``;

    if (item.maxStock && item.maxStock > 0) {
      value += `\n**Stock:** \`${item.stock}/${item.maxStock}\``;
    }
    if (item.dynamicPricing) {
      value += `\n**Dynamic Price:** \`Demand ${(item.demandIndex * 100).toFixed(0)}%\``;
    }

    embed.addFields({
      name: `${item.emoji || '🧩'} ${item.name}`,
      value: `${item.description}\n${value}`
    });
  }

  return embed;
}

function buildCategorySelect(selectedCategory) {
  const options = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    label,
    value,
    default: value === selectedCategory
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shop_category_select')
      .setPlaceholder('Select a category')
      .addOptions(options)
  );
}

function buildNavButtons(userId, category, page, maxPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_prev:${userId}:${category}:${page}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId('shop_page_display')
      .setLabel(`Page ${page}/${maxPages || 1}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`shop_next:${userId}:${category}:${page}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= maxPages),
    new ButtonBuilder()
      .setCustomId(`shop_inventory:${userId}`)
      .setLabel('My Inventory')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`shop_close:${userId}`)
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
  );
}

function buildBuyButtons(items) {
  const row = new ActionRowBuilder();
  for (const item of items) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_buy:${item.itemId}`)
        .setLabel(item.name.slice(0, 20))
        .setStyle(ButtonStyle.Success)
        .setDisabled(item.maxStock > 0 && item.stock <= 0)
    );
  }
  return row;
}

async function fetchPage(category, page) {
  const query = { purchasable: true };
  if (category !== 'all') query.category = category;

  const total = await ShopItem.countDocuments(query);
  const maxPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), maxPages);

  const items = await ShopItem.find(query)
    .sort({ sortOrder: 1, basePrice: 1 })
    .skip((safePage - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE);

  return { items, page: safePage, maxPages };
}

module.exports = {
  CATEGORY_LABELS,
  RARITY_COLORS,
  buildShopEmbed,
  buildCategorySelect,
  buildNavButtons,
  buildBuyButtons,
  fetchPage
};
