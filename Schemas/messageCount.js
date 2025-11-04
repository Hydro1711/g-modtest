const mongoose = require("mongoose");
const MessageCountSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  count: { type: Number, default: 0 }
}, { timestamps: true });
MessageCountSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("MessageCount", MessageCountSchema);
