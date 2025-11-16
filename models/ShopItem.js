// models/ShopItem.js
const { Schema, model } = require('mongoose');

const shopItemSchema = new Schema({
  itemId: { type: String, unique: true, required: true }, // internal ID used in code/buttons
  name: { type: String, required: true },
  description: { type: String, default: 'No description provided.' },
  emoji: { type: String, default: '🧩' },

  category: {
    type: String,
    enum: ['boost', 'upgrade', 'case', 'cosmetic', 'special', 'utility'],
    required: true
  },

  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    default: 'common'
  },

  basePrice: { type: Number, required: true },   // base chip cost
  dynamicPricing: { type: Boolean, default: false },

  demandIndex: { type: Number, default: 0 },     // 0.00 – 1.00, affects dynamic price
  maxStock: { type: Number, default: 0 },        // 0 = unlimited
  stock: { type: Number, default: 0 },           // current stock
  expiresAt: { type: Date, default: null },      // null = permanent

  purchasable: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },

  // Effects for future integration with your games
  effects: {
    workMultiplier: { type: Number, default: 1 },        // affects /work
    casinoMultiplier: { type: Number, default: 1 },      // affects slots/roulette/blackjack etc
    luckBonus: { type: Number, default: 0 },             // generic luck boost
    cooldownReductionMs: { type: Number, default: 0 },   // reduce cooldowns
    heistBoost: { type: Number, default: 0 },            // better heist odds/reward
    interestBonus: { type: Number, default: 0 },         // for /invest later
    isConsumable: { type: Boolean, default: false },     // item gets consumed on use
    durationMs: { type: Number, default: 0 }             // temporary effects
  }
}, {
  timestamps: true
});

shopItemSchema.methods.getCurrentPrice = function () {
  if (!this.dynamicPricing) return this.basePrice;

  // Simple dynamic price formula (can tune later)
  const multiplier = 1 + Math.min(this.demandIndex || 0, 1);
  return Math.max(1, Math.round(this.basePrice * multiplier));
};

module.exports = model('ShopItem', shopItemSchema);
