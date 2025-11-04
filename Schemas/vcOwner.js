const mongoose = require("mongoose");

const VcOwnerSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
});

module.exports = mongoose.model("VcOwner", VcOwnerSchema);
