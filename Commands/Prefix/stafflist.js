const staffRoles = require("../../Schemas/staffRoles.js");

module.exports = {
  name: "stafflist",
  description: "Manage staff roles (prefix command).",
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} args
   */
  execute: async (message, args) => {
    console.log("🔹 Prefix command triggered: stafflist");
    console.log("🔹 Message author:", message.author.tag);
    console.log("🔹 Message content:", message.content);

    // Permission check
    if (!message.member.permissions.has("ManageRoles")) {
      console.log("❌ User does not have ManageRoles permission.");
      return message.reply("❌ You need Manage Roles permission to use this command.");
    }

    const action = args[0]?.toLowerCase();
    const roles = message.mentions.roles.map(r => r).slice(0, 99);

    if (!["add", "remove"].includes(action)) {
      return message.reply(
        "❌ Invalid command usage.\n" +
        "Usage:\n" +
        "`taxx!stafflist add @role @role ...`\n" +
        "`taxx!stafflist remove @role @role ...`"
      );
    }

    if (!roles.length) {
      return message.reply("❌ Please mention at least one role.");
    }

    try {
      let config = await staffRoles.findOne({ guildId: message.guild.id });

      if (!config) {
        config = new staffRoles({ guildId: message.guild.id, roleIds: [] });
      }

      if (action === "add") {
        roles.forEach(r => {
          if (!config.roleIds.includes(r.id)) config.roleIds.push(r.id);
        });
      } else if (action === "remove") {
        config.roleIds = config.roleIds.filter(id => !roles.some(r => r.id === id));
      }

      await config.save();

      return message.reply(
        `✅ Staff roles updated: ${roles.map(r => r.toString()).join(", ")}`
      );
    } catch (err) {
      console.error("❌ Error updating staff roles:", err);
      return message.reply("❌ Something went wrong while updating the staff roles.");
    }
  },
};
