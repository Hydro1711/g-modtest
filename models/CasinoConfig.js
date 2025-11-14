const mongoose = require('mongoose');

const casinoConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  casinoChannelId: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('CasinoConfig', casinoConfigSchema);
