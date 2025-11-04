const mongoose = require("mongoose");
const MemberLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  joinedAt: { type: Date, default: null },
  leftAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.model("MemberLog", MemberLogSchema);
