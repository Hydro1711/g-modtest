// commands/economy/buy.js
const { SlashCommandBuilder } = require('discord.js');
const ShopItem = require('../../models/ShopItem');
const User = require('../../models/User'); // adjust path

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop by ID.')
    .addStringOption(opt =>
      opt.setName('item')
        .setDescription('The itemId of the item you want to buy')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('quantity')
        .setDescription('How many to buy (default: 1)')
        .setMinValue(1)
        .setRequired(false)
    )
    .setDMPermission(false),

  category: 'Economy',

  async execute(interaction) {
    const itemId = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') || 1;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const item = await ShopItem.findOne({ itemId });
    if (!item || !item.purchasable) {
      return interaction.reply({ content: '❌ That item does not exist or is not purchasable.', ephemeral: true });
    }

    const priceEach = item.getCurrentPrice ? item.getCurrentPrice() : item.basePrice;
    const totalCost = priceEach * quantity;

    if (item.maxStock && item.maxStock > 0 && item.stock < quantity) {
      return interaction.reply({
        content: `❌ Not enough stock. Available: \`${item.stock}\`.`,
        ephemeral: true
      });
    }

    let user = await User.findOne({ userId, guildId });
    if (!user) {
      user = await User.create({ userId, guildId, chips: 0 });
    }

    if (user.chips < totalCost) {
      return interaction.reply({
        content: `❌ You don't have enough chips. You need \`${totalCost.toLocaleString()} chips\`.`,
        ephemeral: true
      });
    }

    // Charge user
    user.chips -= totalCost;

    // Add to inventory
    const invItem = user.inventory.find(i => i.itemId === itemId);
    if (invItem) {
      invItem.quantity += quantity;
    } else {
      user.inventory.push({ itemId, quantity });
    }

    // Update stock & demand
    if (item.maxStock && item.maxStock > 0) {
      item.stock -= quantity;
    }

    if (item.dynamicPricing) {
      item.demandIndex = Math.min((item.demandIndex || 0) + (0.01 * quantity), 1);
    }

    await Promise.all([user.save(), item.save()]);

    return interaction.reply({
      content: `✅ You bought **${quantity}x ${item.emoji || ''} ${item.name}** for \`${totalCost.toLocaleString()} chips\`.`,
      ephemeral: true
    });
  }
};
