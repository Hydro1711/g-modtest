const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const staffRoles = require("../../Schemas/staffRoles.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("Add or remove staff roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    // ADD subcommand
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add staff roles (up to 10).")
        .addRoleOption(opt => opt.setName("role1").setDescription("Staff role").setRequired(true))
        .addRoleOption(opt => opt.setName("role2").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role3").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role4").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role5").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role6").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role7").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role8").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role9").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role10").setDescription("Staff role").setRequired(false))
    )

    // REMOVE subcommand
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove staff roles (up to 10).")
        .addRoleOption(opt => opt.setName("role1").setDescription("Staff role").setRequired(true))
        .addRoleOption(opt => opt.setName("role2").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role3").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role4").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role5").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role6").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role7").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role8").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role9").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role10").setDescription("Staff role").setRequired(false))
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });

      // Get or create config safely (NO duplicates ever)
      let config = await staffRoles.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $setOnInsert: { roleIds: [] } },
        { new: true, upsert: true }
      );

      const sub = interaction.options.getSubcommand();

      // Collect up to 10 roles
      const roles = [];
      for (let i = 1; i <= 10; i++) {
        const role = interaction.options.getRole(`role${i}`);
        if (role) roles.push(role);
      }

      if (!roles.length) {
        return interaction.editReply("❌ No valid roles provided.");
      }

      if (sub === "add") {
        roles.forEach(r => {
          if (!config.roleIds.includes(r.id)) config.roleIds.push(r.id);
        });

        await config.save();

        return interaction.editReply(
          `✅ Added staff roles:\n${roles.map(r => `• ${r}`).join("\n")}`
        );
      }

      if (sub === "remove") {
        config.roleIds = config.roleIds.filter(id => !roles.some(r => r.id === id));
        await config.save();

        return interaction.editReply(
          `🗑 Removed staff roles:\n${roles.map(r => `• ${r}`).join("\n")}`
        );
      }
    } catch (err) {
      console.error("❌ /stafflist error:", err);

      if (interaction.deferred) {
        return interaction.editReply("❌ An error occurred while running this command.");
      }
      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ An error occurred.",
          ephemeral: true,
        });
      }
    }
  },
};
