const mongoose = require("mongoose");

const warnSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  modId: { type: String, required: true },
  reason: { type: String, default: "No reason provided" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Warns", warnSchema);
