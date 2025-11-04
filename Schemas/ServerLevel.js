const mongoose = require("mongoose");
const ServerLevelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 }
}, { timestamps: true });
ServerLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("ServerLevel", ServerLevelSchema);
