const mongoose = require("mongoose");

const VoiceMasterConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  joinToCreateChannelId: { type: String, required: true },
  interfaceChannelId: { type: String, required: true },
  categoryId: { type: String, required: true },
});

module.exports = mongoose.model("VoiceMasterConfig", VoiceMasterConfigSchema);
