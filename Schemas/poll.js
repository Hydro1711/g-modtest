const mongoose = require("mongoose");
const PollSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  messageId: { type: String },
  authorId: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  votes: { type: Map, of: String, default: {} },
  endsAt: { type: Date, default: null },
  closed: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model("Poll", PollSchema);
