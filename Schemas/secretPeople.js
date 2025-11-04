const mongoose = require("mongoose");
const SecretPeopleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  note: { type: String, default: null }
}, { timestamps: true });
SecretPeopleSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("SecretPeople", SecretPeopleSchema);
