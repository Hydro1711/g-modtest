const mongoose = require("mongoose");
const IgnoredUsersSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  reason: { type: String, default: "No reason provided" },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });
IgnoredUsersSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("IgnoredUser", IgnoredUsersSchema);
