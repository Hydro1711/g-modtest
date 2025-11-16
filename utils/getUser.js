const User = require("../models/user");

async function getUser(userId) {
  return await User.findOneAndUpdate(
    { userId },
    {},
    { new: true, upsert: true }
  );
}

module.exports = getUser;
