const mongoose = require("mongoose");

const AfkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  reason: { type: String, default: "AFK" },
  timestamp: { type: Date, default: Date.now }
});

AfkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model("Afk", AfkSchema);
