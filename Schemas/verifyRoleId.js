const mongoose = require("mongoose");
const VerifyRoleIdSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  roleId: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model("VerifyRoleId", VerifyRoleIdSchema);
