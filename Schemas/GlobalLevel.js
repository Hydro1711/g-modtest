const mongoose = require("mongoose");
const GlobalLevelSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model("GlobalLevel", GlobalLevelSchema);
