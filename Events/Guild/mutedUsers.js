const mongoose = require("mongoose");

const MutedUserSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, default: "Unknown" },
  reason: { type: String, default: "No reason provided" },
  mutedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MutedUsers", MutedUserSchema);
