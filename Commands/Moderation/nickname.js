const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Change a member's nickname")
    .addUserOption(option =>
      option.setName("member")
        .setDescription("The member whose nickname you want to change")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("nickname")
        .setDescription("The new nickname (leave empty to reset)")
        .setRequired(false)),
        
  async execute(interaction) {
    // check if the user has the "Manage Nicknames" permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({
        content: "❌ You don’t have permission to change nicknames.",
        ephemeral: true
      });
    }

    const member = interaction.options.getMember("member");
    const newNick = interaction.options.getString("nickname");

    if (!member) {
      return interaction.reply({ content: "❌ Couldn’t find that member.", ephemeral: true });
    }

    try {
      await member.setNickname(newNick || null);
      await interaction.reply({
        content: `✅ Changed **${member.user.tag}**'s nickname to **${newNick || member.user.username}**`
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ I couldn’t change that nickname (check my role position & permissions).",
        ephemeral: true
      });
    }
  }
};
