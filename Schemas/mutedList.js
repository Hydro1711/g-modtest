const mongoose = require("mongoose");
const MutedListSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  reason: { type: String, default: "No reason provided" },
  mutedUntil: { type: Date, default: null }
}, { timestamps: true });
MutedListSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("MutedList", MutedListSchema);
