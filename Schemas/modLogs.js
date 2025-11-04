const mongoose = require("mongoose");

const modLogsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.ModLogs || mongoose.model("ModLogs", modLogsSchema);
