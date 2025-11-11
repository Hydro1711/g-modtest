// Schemas/MuteRole.js
const mongoose = require("mongoose");

const muteRoleSchema = new mongoose.Schema({
  Guild: { type: String, required: true, unique: true },
  RoleID: { type: String, required: true },
});

module.exports = mongoose.model("MuteRole", muteRoleSchema);
