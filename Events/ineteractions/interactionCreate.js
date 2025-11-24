const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");

const Poll = require("../../Schemas/poll");
const ShopItem = require("../../models/ShopItem");
const User = require("../../models/user");

// =====================================================
// SHOP CONSTANTS & HELPERS
// =====================================================
const ITEMS_PER_PAGE = 5;

const CATEGORY_LABELS = {
  all: "All Items",
  boost: "Boosts",
  upgrade: "Upgrades",
  case: "Cases",
  cosmetic: "Cosmetics",
  special: "Special",
  utility: "Utility",
};

const RARITY_COLORS = {
  common: 0x9ca3af,
  uncommon: 0x22c55e,
  rare: 0x3b82f6,
  epic: 0xa855f7,
  legendary: 0xf59e0b,
  mythic: 0xec4899,
};

function buildShopEmbed(user, items, category, page, maxPages) {
  const embed = new EmbedBuilder()
    .setTitle("🏪 Advanced Chip Shop")
    .setDescription(
      `Browse and buy items using your **casino chips**.\n` +
        `Category: **${CATEGORY_LABELS[category] || "All Items"}**\n` +
        `Page: **${page}/${maxPages || 1}**`
    )
    .setTimestamp();

  const colorRarity = items[0]?.rarity || "common";
  embed.setColor(RARITY_COLORS[colorRarity] || 0xffffff);

  if (!items || items.length === 0) {
    embed.addFields({
      name: "No items here yet",
      value: "Try a different category.",
    });
    return embed;
  }

  for (const item of items) {
    const price = item.getCurrentPrice ? item.getCurrentPrice() : item.basePrice;
    const stock =
      item.maxStock && item.maxStock > 0
        ? `${item.stock}/${item.maxStock}`
        : "Unlimited";

    let value =
      `**Price:** \`${price.toLocaleString()} chips\`\n` +
      `**Rarity:** \`${item.rarity}\`\n` +
      `**Category:** \`${
        CATEGORY_LABELS[item.category] || item.category
      }\`\n` +
      `**Stock:** \`${stock}\``;

    if (item.dynamicPricing) {
      value += `\n**Dynamic Price:** \`Demand ${(item.demandIndex * 100).toFixed(
        0
      )}%\``;
    }

    embed.addFields({
      name: `${item.emoji || "🧩"} ${item.name}`,
      value: `${item.description}\n${value}`,
    });
  }

  return embed;
}

function buildCategorySelect(selectedCategory) {
  const options = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    label,
    value,
    default: value === selectedCategory,
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("shop_category_select")
      .setPlaceholder("Select a category")
      .addOptions(options)
  );
}

function buildNavButtons(userId, category, page, maxPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_prev:${userId}:${category}:${page}`)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),

    new ButtonBuilder()
      .setCustomId("shop_page_display")
      .setLabel(`Page ${page}/${maxPages || 1}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId(`shop_next:${userId}:${category}:${page}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= maxPages),

    new ButtonBuilder()
      .setCustomId(`shop_inventory:${userId}`)
      .setLabel("My Inventory")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`shop_close:${userId}`)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildBuyRows(items) {
  if (!items || items.length === 0) return [];

  const buttons = items.map((item) =>
    new ButtonBuilder()
      .setCustomId(`shop_buy:${item.itemId}`)
      .setLabel(item.name.slice(0, 20))
      .setStyle(ButtonStyle.Success)
      .setDisabled(item.maxStock > 0 && item.stock <= 0)
  );

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const slice = buttons.slice(i, i + 5);
    if (slice.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(slice));
    }
  }

  return rows;
}

async function fetchPage(category, page) {
  const query = { purchasable: true };

  if (category !== "all") {
    query.category = category;
  }

  const total = await ShopItem.countDocuments(query);
  const maxPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), maxPages);

  const items = await ShopItem.find(query)
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

  /**
   * This handler ONLY cares about:
   *  - Poll buttons: customId starts with "poll_"
   *  - Shop buttons: customId starts with "shop_"
   *  - Shop category select: "shop_category_select"
   */
  async execute(interaction) {
    try {
      // If it's not a button OR select menu, we don't touch it
      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

      // ==========================================================
      // 📌 POLL SYSTEM
      // ==========================================================
      if (interaction.isButton() && interaction.customId.startsWith("poll_")) {
        const [, action] = interaction.customId.split("_");

        const poll = await Poll.findOne({ messageId: interaction.message.id });
        if (!poll || poll.ended) {
          await interaction.reply({
            content: "❌ This poll has ended.",
            ephemeral: true,
          });
          return;
        }

        // end poll
        if (action === "end") {
          if (
            !interaction.member.permissions.has(
              PermissionsBitField.Flags.ManageRoles
            )
          ) {
            await interaction.reply({
              content:
                "❌ Only users with **Manage Roles** can end polls.",
              ephemeral: true,
            });
            return;
          }

          poll.ended = true;
          await poll.save();

          const results = {};
          for (const opt of poll.options) results[opt] = 0;
          for (const [, vote] of poll.votes) {
            results[poll.options[vote]]++;
          }

          let resultText = "";
          for (const [opt, count] of Object.entries(results)) {
            resultText += `**${opt}** — ${count} votes\n`;
          }

          const baseEmbed = interaction.message.embeds[0]
            ? EmbedBuilder.from(interaction.message.embeds[0])
            : new EmbedBuilder().setTitle("Poll");

          const endedEmbed = baseEmbed
            .setColor("Red")
            .setFooter({ text: "Poll ended" })
            .setDescription(`${poll.question}\n\nResults:\n${resultText}`);

          await interaction.update({
            embeds: [endedEmbed],
            components: [],
          });
          return;
        }

        // vote: poll_0, poll_1, etc.
        const optionIndex = parseInt(action, 10);
        if (!isNaN(optionIndex)) {
          if (!poll.votes) poll.votes = new Map();
          poll.votes.set(interaction.user.id, optionIndex);
          await poll.save();

          const results = {};
          for (const opt of poll.options) results[opt] = 0;
          for (const [, vote] of poll.votes) {
            results[poll.options[vote]]++;
          }

          let resultText = "";
          for (const [opt, count] of Object.entries(results)) {
            resultText += `**${opt}** — ${count} votes\n`;
          }

          const baseEmbed = interaction.message.embeds[0]
            ? EmbedBuilder.from(interaction.message.embeds[0])
            : new EmbedBuilder().setTitle("Poll");

          const updatedEmbed = baseEmbed
            .setDescription(`${poll.question}\n\nResults:\n${resultText}`)
            .setColor("Blue")
            .setFooter({ text: "Poll is ongoing" });

          await interaction.update({ embeds: [updatedEmbed] });
          await interaction.followUp({
            content: `✅ You voted **${poll.options[optionIndex]}**`,
            ephemeral: true,
          });
          return;
        }

        // If some weird poll_* id but not handled
        return;
      }

      // ==========================================================
      // 🏪 SHOP SYSTEM
      // ==========================================================

      // CATEGORY SELECT
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "shop_category_select"
      ) {
        const category = interaction.values[0] || "all";
        const userId = interaction.user.id;

        const { items, page, maxPages } = await fetchPage(category, 1);
        const embed = buildShopEmbed(
          interaction.user,
          items,
          category,
          page,
          maxPages
        );
        const navRow = buildNavButtons(userId, category, page, maxPages);
        const catRow = buildCategorySelect(category);
        const buyRows = buildBuyRows(items);

        await interaction.update({
          embeds: [embed],
          components: [navRow, catRow, ...buyRows],
        });
        return;
      }

      // NAV BUTTONS (PREV)
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("shop_prev:")
      ) {
        const [, ownerId, category, pageStr] =
          interaction.customId.split(":");
        if (interaction.user.id !== ownerId) {
          await interaction.reply({
            content: "❌ This shop panel isn't yours.",
            ephemeral: true,
          });
          return;
        }

        const newPage = (parseInt(pageStr, 10) || 1) - 1;
        const { items, page, maxPages } = await fetchPage(category, newPage);

        const embed = buildShopEmbed(
          interaction.user,
          items,
          category,
          page,
          maxPages
        );
        const navRow = buildNavButtons(ownerId, category, page, maxPages);
        const catRow = buildCategorySelect(category);
        const buyRows = buildBuyRows(items);

        await interaction.update({
          embeds: [embed],
          components: [navRow, catRow, ...buyRows],
        });
        return;
      }

      // NAV BUTTONS (NEXT)
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("shop_next:")
      ) {
        const [, ownerId, category, pageStr] =
          interaction.customId.split(":");
        if (interaction.user.id !== ownerId) {
          await interaction.reply({
            content: "❌ This shop panel isn't yours.",
            ephemeral: true,
          });
          return;
        }

        const newPage = (parseInt(pageStr, 10) || 1) + 1;
        const { items, page, maxPages } = await fetchPage(category, newPage);

        const embed = buildShopEmbed(
          interaction.user,
          items,
          category,
          page,
          maxPages
        );
        const navRow = buildNavButtons(ownerId, category, page, maxPages);
        const catRow = buildCategorySelect(category);
        const buyRows = buildBuyRows(items);

        await interaction.update({
          embeds: [embed],
          components: [navRow, catRow, ...buyRows],
        });
        return;
      }

      // CLOSE SHOP
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("shop_close:")
      ) {
        const [, ownerId] = interaction.customId.split(":");
        if (interaction.user.id !== ownerId) {
          await interaction.reply({
            content: "❌ You can't close someone else's shop.",
            ephemeral: true,
          });
          return;
        }

        await interaction.update({
          content: "🛒 Shop closed.",
          embeds: [],
          components: [],
        });
        return;
      }

      // INVENTORY VIEW
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("shop_inventory:")
      ) {
        const [, ownerId] = interaction.customId.split(":");
        if (interaction.user.id !== ownerId) {
          await interaction.reply({
            content: "❌ That's not your inventory.",
            ephemeral: true,
          });
          return;
        }

        let user = await User.findOne({ userId: ownerId });
        if (!user || !user.inventory || user.inventory.length === 0) {
          await interaction.reply({
            content: "📦 Your inventory is empty.",
            ephemeral: true,
          });
          return;
        }

        const itemIds = user.inventory.map((i) => i.itemId);
        const shopItems = await ShopItem.find({
          itemId: { $in: itemIds },
        });

        const invEmbed = new EmbedBuilder()
          .setTitle("📦 Your Inventory")
          .setColor(0x22c55e)
          .setTimestamp();

        for (const invItem of user.inventory) {
          const sItem = shopItems.find((s) => s.itemId === invItem.itemId);
          if (!sItem) continue;

          invEmbed.addFields({
            name: `${sItem.emoji || "📦"} ${sItem.name} x${
              invItem.quantity
            }`,
            value: sItem.description || "No description.",
          });
        }

        await interaction.reply({ embeds: [invEmbed], ephemeral: true });
        return;
      }

      // BUY BUTTON
      if (
        interaction.isButton() &&
        interaction.customId.startsWith("shop_buy:")
      ) {
        const [, itemId] = interaction.customId.split(":");

        const item = await ShopItem.findOne({ itemId });
        if (!item || !item.purchasable) {
          await interaction.reply({
            content: "❌ This item is not available.",
            ephemeral: true,
          });
          return;
        }

        const price = item.getCurrentPrice
          ? item.getCurrentPrice()
          : item.basePrice;

        let user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
          user = await User.create({
            userId: interaction.user.id,
            chips: 0,
            inventory: [],
          });
        }

        if (user.chips < price) {
          await interaction.reply({
            content: `❌ You don't have enough chips. You need \`${price.toLocaleString()} chips\`.`,
            ephemeral: true,
          });
          return;
        }

        user.chips -= price;

        const invItem = user.inventory.find((i) => i.itemId === itemId);
        if (invItem) invItem.quantity += 1;
        else user.inventory.push({ itemId, quantity: 1 });

        if (item.maxStock && item.maxStock > 0) item.stock -= 1;
        if (item.dynamicPricing) {
          item.demandIndex = Math.min((item.demandIndex || 0) + 0.01, 1);
        }

        await Promise.all([user.save(), item.save()]);

        await interaction.reply({
          content: `✅ You bought **1x ${item.emoji || ""} ${
            item.name
          }** for \`${price.toLocaleString()} chips\`.`,
          ephemeral: true,
        });
        return;
      }

      // If it's some other button/select (not poll or shop), we ignore it.
    } catch (error) {
      console.error("[ERROR] shop/poll interaction handler:", error);
      // Only try to respond if nobody else has already.
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: "❌ An error occurred while processing this interaction.",
          });
        } else if (interaction.isRepliable()) {
          await interaction.reply({
            content: "❌ An error occurred while processing this interaction.",
            ephemeral: true,
          });
        }
      } catch {
        // ignore secondary failures
      }
    }
  },
};
