const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const MuteRoleDB = require("../../Schemas/muteRole");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_mute_role")
    .setDescription("Set the role used for muting members")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Select the role to use as muted role")
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole("role");

    if (!role) {
      console.warn(`[SetupMuteRole] ${interaction.user.tag} did not provide a valid role.`);
      return interaction.reply({ content: "<:closekIcon:1395099724473700544> Please provide a valid role.", ephemeral: true });
    }

    console.log(`[SetupMuteRole] ${interaction.user.tag} is setting mute role to ${role.name} (${role.id}) in guild ${interaction.guild.id}`);

    try {
      await MuteRoleDB.findOneAndUpdate(
        { Guild: interaction.guild.id },
        { RoleID: role.id, Guild: interaction.guild.id },
        { upsert: true }
      );

      console.log(`[SetupMuteRole] Successfully set mute role to ${role.name} (${role.id}) in guild ${interaction.guild.id}`);

      return interaction.reply({ content: `<:checkIcon:1395099367333167307> Muted role set to **${role.name}**`, ephemeral: true });
    } catch (error) {
      console.error(`[SetupMuteRole] Error saving muted role for guild ${interaction.guild.id}:`, error);
      return interaction.reply({ content: `<:closekIcon:1395099724473700544> Error saving muted role: ${error.message}`, ephemeral: true });
    }
  }
};
