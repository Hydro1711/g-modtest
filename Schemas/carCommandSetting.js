//Schemas/carCommandSetting.js
const mongoose = require("mongoose");

const carCommandSettingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model("CarCommandSetting", carCommandSettingSchema);
