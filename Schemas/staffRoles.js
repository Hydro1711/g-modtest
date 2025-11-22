const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  roleIds: { type: [String], default: [] },
});

module.exports = mongoose.model('staffRoles', staffSchema);
