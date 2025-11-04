const mongoose = require("mongoose");
const AntiMultiAttachmentSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  maxAttachments: { type: Number, default: 3 },
  timeframeSec: { type: Number, default: 5 },
  action: { type: String, enum: ["warn", "delete", "mute"], default: "delete" },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("AntiMultiAttachment", AntiMultiAttachmentSchema);
