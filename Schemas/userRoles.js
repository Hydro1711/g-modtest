// Schemas/UserRoles.js
const mongoose = require("mongoose");

const userRolesSchema = new mongoose.Schema({
  Guild: { type: String, required: true },
  User: { type: String, required: true },
  Roles: { type: [String], default: [] }, // Array of role IDs
});

module.exports = mongoose.model("UserRoles", userRolesSchema);
