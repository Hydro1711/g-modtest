const mongoose = require("mongoose");

const MutedUsersSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  mutedAt: { type: Date, default: Date.now },
  reason: String,
  moderatorId: String,
});

module.exports =
  mongoose.models.MutedUsers || mongoose.model("MutedUsers", MutedUsersSchema);
