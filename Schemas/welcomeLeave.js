const mongoose = require("mongoose");
const WelcomeLeaveSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  welcomeChannelId: { type: String, default: null },
  leaveChannelId: { type: String, default: null },
  welcomeMessage: { type: String, default: "Welcome {user}!" },
  leaveMessage: { type: String, default: "{user} left the server." }
}, { timestamps: true });
module.exports = mongoose.model("WelcomeLeave", WelcomeLeaveSchema);
