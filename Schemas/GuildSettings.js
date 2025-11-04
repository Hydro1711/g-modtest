const mongoose = require("mongoose");

const GuildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  prefix: { type: String, default: "!" },

  levelUpChannelId: { type: String, default: null },

  levelsEnabled: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("GuildSettings", GuildSettingsSchema);
