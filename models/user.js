const mongoose = require("mongoose");

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
  jailUntil:   { type: Date, default: null },

  // Rob cooldown
  lastRob:     { type: Date, default: null },

  // Streak
  streakCount:     { type: Number, default: 0 },
  lastStreakClaim: { type: Date, default: null },

  // Inventory (simple)
  items: [
    {
      itemId: { type: String, required: true }, // e.g. "lucky_charm"
      amount: { type: Number, default: 0 },
    },
  ],

  // Temporary buffs (optional, used by items)
  luckUntil:      { type: Date, default: null },  // e.g. better odds for slots/coinflip
  robBoostUntil:  { type: Date, default: null },  // better rob results
  heistBoostUntil:{ type: Date, default: null },  // better heist success
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
