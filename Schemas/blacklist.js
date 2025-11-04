const mongoose = require("mongoose");
const BlacklistSchema = new mongoose.Schema({
  guildId: { type: String, required: false, index: true },
  userId: { type: String, required: true, index: true },
  reason: { type: String, default: "No reason provided" },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });
BlacklistSchema.index({ guildId: 1, userId: 1 }, { unique: true, partialFilterExpression: { guildId: { $type: "string" } } });
module.exports = mongoose.model("Blacklist", BlacklistSchema);
