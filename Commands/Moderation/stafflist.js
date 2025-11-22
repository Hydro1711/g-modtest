const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const staffRoles = require("../../Schemas/staffRoles.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("Add or remove staff roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add roles to the staff list.")
        .addRoleOption(opt => opt.setName("role1").setDescription("Staff role").setRequired(true))
        .addRoleOption(opt => opt.setName("role2").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role3").setDescription("Staff role").setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove roles from the staff list.")
        .addRoleOption(opt => opt.setName("role1").setDescription("Staff role").setRequired(true))
        .addRoleOption(opt => opt.setName("role2").setDescription("Staff role").setRequired(false))
        .addRoleOption(opt => opt.setName("role3").setDescription("Staff role").setRequired(false))
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });

      // Always get or create (no duplicates)
      let config = await staffRoles.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $setOnInsert: { roleIds: [] } },
        { new: true, upsert: true }
      );

      const sub = interaction.options.getSubcommand();
      const roles = [
        interaction.options.getRole("role1"),
        interaction.options.getRole("role2"),
        interaction.options.getRole("role3"),
      ].filter(Boolean);

      if (sub === "add") {
        roles.forEach(r => {
          if (!config.roleIds.includes(r.id)) config.roleIds.push(r.id);
        });

        await config.save();

        return interaction.editReply({
          content: `✅ Added staff roles: ${roles.map(r => r.toString()).join(", ")}`,
        });
      }

      if (sub === "remove") {
        config.roleIds = config.roleIds.filter(id => !roles.some(r => r.id === id));

        await config.save();

        return interaction.editReply({
          content: `🗑 Removed staff roles: ${roles.map(r => r.toString()).join(", ")}`,
        });
      }
    } catch (err) {
      console.error("❌ /stafflist error:", err);

      if (interaction.deferred) {
        return interaction.editReply("❌ An error occurred.");
      } else {
        return interaction.reply({ content: "❌ An error occurred.", ephemeral: true });
      }
    }
  },
};
