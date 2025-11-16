const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true }, // must match ShopItem.itemId
  amount: { type: Number, default: 0 }
}, { _id: false });

const activeBoostSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  expiresAt: { type: Date, required: true },

  // These values come from the item effects
  workMultiplier: { type: Number, default: 1 },
  casinoMultiplier: { type: Number, default: 1 },
  luckBonus: { type: Number, default: 0 },
  cooldownReductionMs: { type: Number, default: 0 },
  heistBoost: { type: Number, default: 0 }
}, { _id: false });

const permanentUpgradeSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  // The item’s effect values locked in as a permanent upgrade
  workMultiplier: { type: Number, default: 1 },
  casinoMultiplier: { type: Number, default: 1 },
  luckBonus: { type: Number, default: 0 },
  cooldownReductionMs: { type: Number, default: 0 },
  heistBoost: { type: Number, default: 0 }
}, { _id: false });

// ======================================================================
// MAIN USER SCHEMA
// ======================================================================
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // GLOBAL chips
  chips: { type: Number, default: 0 },

  // Cooldowns
  lastClaim:   { type: Date, default: null },
  lastWeekly:  { type: Date, default: null },
  lastWork:    { type: Date, default: null },
  lastBeg:     { type: Date, default: null },
  lastHeist:   { type: Date, default: null },
  lastRob:     { type: Date, default: null },

  jailUntil:   { type: Date, default: null },

  // Streak
  streakCount:     { type: Number, default: 0 },
  lastStreakClaim: { type: Date, default: null },

  // ==================================================================
  // ADVANCED INVENTORY SYSTEM
  // ==================================================================
  inventory: { type: [inventoryItemSchema], default: [] },

  // TEMPORARY EFFECTS (e.g. consumable buffs)
  activeBoosts: { type: [activeBoostSchema], default: [] },

  // PERMANENT UPGRADES (e.g., quantum watch, black diamond card, etc)
  permanentUpgrades: { type: [permanentUpgradeSchema], default: [] },

  // OLD leftover buffs (kept for backward compatibility)
  luckUntil:      { type: Date, default: null },
  robBoostUntil:  { type: Date, default: null },
  heistBoostUntil:{ type: Date, default: null },

}, { timestamps: true });

// ======================================================================
// COMPUTED STATS — Auto-combines all active boosts & upgrades
// ======================================================================
userSchema.methods.getTotalMultipliers = function () {
  let work = 1;
  let casino = 1;
  let luck = 0;
  let cooldown = 0;
  let heist = 0;

  // Permanent upgrades
  for (const up of this.permanentUpgrades) {
    work *= up.workMultiplier;
    casino *= up.casinoMultiplier;
    luck += up.luckBonus;
    cooldown += up.cooldownReductionMs;
    heist += up.heistBoost;
  }

  // Temporary boosts (only active ones)
  const now = Date.now();
  for (const boost of this.activeBoosts) {
    if (boost.expiresAt > now) {
      work *= boost.workMultiplier;
      casino *= boost.casinoMultiplier;
      luck += boost.luckBonus;
      cooldown += boost.cooldownReductionMs;
      heist += boost.heistBoost;
    }
  }

  return {
    workMultiplier: work,
    casinoMultiplier: casino,
    luckBonus: luck,
    cooldownReductionMs: cooldown,
    heistBoost: heist
  };
};

// Remove expired boosts automatically (optional utility)
userSchema.methods.cleanExpiredBoosts = function () {
  const now = Date.now();
  this.activeBoosts = this.activeBoosts.filter(b => b.expiresAt > now);
};

module.exports = mongoose.model("User", userSchema);
