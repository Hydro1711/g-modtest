const { Schema, model } = require("mongoose");

const shopItemSchema = new Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  emoji: { type: String, default: "🧩" },

  category: {
    type: String,
    enum: ["boost", "upgrade", "case", "cosmetic", "special", "utility"],
    required: true
  },

  rarity: {
    type: String,
    enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
    default: "common"
  },

  basePrice: { type: Number, required: true },
  dynamicPricing: { type: Boolean, default: false },

  demandIndex: { type: Number, default: 0 },

  maxStock: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },

  expiresAt: { type: Date, default: null },

  purchasable: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },

  effects: {
    workMultiplier: { type: Number, default: 1 },
    casinoMultiplier: { type: Number, default: 1 },
    luckBonus: { type: Number, default: 0 },
    cooldownReductionMs: { type: Number, default: 0 },
    heistBoost: { type: Number, default: 0 },
    isConsumable: { type: Boolean, default: false },
    durationMs: { type: Number, default: 0 }
  }
});

shopItemSchema.methods.getCurrentPrice = function () {
  if (!this.dynamicPricing) return this.basePrice;
  return Math.round(this.basePrice * (1 + this.demandIndex));
};

module.exports = model("ShopItem", shopItemSchema);
