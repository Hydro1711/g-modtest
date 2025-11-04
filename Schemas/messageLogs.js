const mongoose = require("mongoose");
const MessageLogsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  channelId: { type: String, required: true },
  logEdits: { type: Boolean, default: true },
  logDeletes: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("MessageLogs", MessageLogsSchema);
