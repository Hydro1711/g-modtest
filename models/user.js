const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // GLOBAL CHIPS (shared across all servers)
  chips: { type: Number, default: 0 },

  // COOLDOWNS
  lastClaim: { type: Date, default: null },     // daily
  lastWeekly: { type: Date, default: null },     // weekly
  lastWork: { type: Date, default: null },       // work cooldown
  lastBeg: { type: Date, default: null },        // beg cooldown
  jailUntil: { type: Date, default: null },      // heist jail timer
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
