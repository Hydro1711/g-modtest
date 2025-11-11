
// mutedList.js

const mongoose = require("mongoose");

const mutedListSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: "No reason provided." },
  mutedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MutedList", mutedListSchema);