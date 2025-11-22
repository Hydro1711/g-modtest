const mongoose = require("mongoose");

const staffCacheSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  memberId: { type: String, required: true },
  cachedName: { type: String, required: true },
  lastUpdated: { type: Number, required: true }, // timestamp (ms)
});

staffCacheSchema.index({ guildId: 1, memberId: 1 }, { unique: true });

module.exports = mongoose.model("staffCache", staffCacheSchema);
