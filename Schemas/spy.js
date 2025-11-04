const mongoose = require("mongoose");
const SpySchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  messageId: { type: String },
  channelId: { type: String },
  content: { type: String },
  timestamp: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model("Spy", SpySchema);
