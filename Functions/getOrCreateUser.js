// Functions/getOrCreateUser.js
const User = require("../models/user");

module.exports = async function getOrCreateUser(userId) {
  let user = await User.findOne({ userId });

  if (!user) {
    user = await User.create({
      userId,
      chips: 0,
      inventory: [],
      activeBoosts: [],
      permanentUpgrades: []
    });
  }

  return user;
};
