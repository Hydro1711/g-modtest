const mongoose = require("mongoose");

const warnSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  modId: { type: String, required: true },

  // Unique case ID for management/deletion
  caseId: { type: String, required: true },

  // Human reason
  reason: { type: String, default: "No reason provided" },

  // Timestamp warning was created
  timestamp: { type: Number, default: () => Date.now() },

  // When the warning expires (for auto-expiring warnings)
  expiresAt: { type: Number, default: null },

  // Severity of the warn (optional)
  severity: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium"
  },

  // Additional info for mods (optional)
  notes: {
    type: String,
    default: null
  },

  // Evidence (image URL, message link, etc)
  evidence: {
    type: String,
    default: null
  },

  // Type of moderation action that created this warn
  actionType: {
    type: String,
    enum: ["Warn", "AutoWarn", "AutoMod"],
    default: "Warn"
  }
});

module.exports = mongoose.model("Warns", warnSchema);
