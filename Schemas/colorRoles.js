const mongoose = require("mongoose");
const ColorRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  emoji: { type: String, required: true },
  roleId: { type: String, required: true }
}, { timestamps: true });
ColorRoleSchema.index({ guildId: 1, messageId: 1, emoji: 1 }, { unique: true });
module.exports = mongoose.model("ColorRole", ColorRoleSchema);
