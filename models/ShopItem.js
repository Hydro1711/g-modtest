const mongoose = require("mongoose");

const ShopItemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: "No description."
    },

    emoji: {
        type: String,
        default: "📦"
    },

    // --- CATEGORY ---
    // all | boost | upgrade | case | cosmetic | special | utility
    category: {
        type: String,
        required: true,
        default: "utility"
    },

    // --- RARITY ---
    // common | uncommon | rare | epic | legendary | mythic
    rarity: {
        type: String,
        required: true,
        default: "common"
    },

    // --- BASE PRICE ---
    basePrice: {
        type: Number,
        required: true,
        default: 100
    },

    // --- PURCHASEABLE? ---
    purchasable: {
        type: Boolean,
        default: true
    },

    // --- STOCK SYSTEM ---
    maxStock: {
        type: Number,
        default: 0 // 0 = unlimited
    },

    stock: {
        type: Number,
        default: 0
    },

    // --- DYNAMIC PRICING ---
    dynamicPricing: {
        type: Boolean,
        default: false
    },

    demandIndex: {
        type: Number,
        default: 0 // 0 → +0%, 1 → +100%
    },

    // --- ITEM EFFECTS ---
    effects: {
        type: Object,
        default: {} // workMultiplier, casinoMultiplier, luckBonus, etc.
    },

    // --- SORT ORDER FOR SHOP LISTS ---
    sortOrder: {
        type: Number,
        default: 0
    }
});

// Compute dynamic price
ShopItemSchema.methods.getCurrentPrice = function () {
    if (!this.dynamicPricing) return this.basePrice;

    const increase = this.basePrice * this.demandIndex;
    return Math.round(this.basePrice + increase);
};

module.exports = mongoose.model("ShopItem", ShopItemSchema);
