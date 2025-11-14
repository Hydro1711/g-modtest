// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  chips: { type: Number, default: 0 },
  lastClaim: { type: Date, default: null },
});

module.exports = mongoose.model('User', userSchema);
