// schemas/GlobalLevel.js
const { Schema, model } = require("mongoose");

const globalLevelSchema = new Schema({
  userId: { type: String, required: true },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = model("GlobalLevel", globalLevelSchema);
