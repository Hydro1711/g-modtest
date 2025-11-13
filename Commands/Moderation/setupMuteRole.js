const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const MuteRoleDB = require("../../Schemas/muteRole");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_mute_role")
    .setDescription("Automatically set up the muted role with full permissions & channel overwrites.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Select an existing role (leave empty to auto-create one)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let role = interaction.options.getRole("role");

    // AUTO CREATE MUTED ROLE IF NONE PROVIDED
    if (!role) {
      role = await interaction.guild.roles.create({
        name: "Muted",
        color: "#2f3136",
        permissions: [],
        reason: `Auto-created Muted role by ${interaction.user.tag}`
      });

      console.log(`[MuteSetup] Auto-created Muted role in guild ${interaction.guild.id}`);
    }

    // SAVE ROLE TO DB
    try {
      await MuteRoleDB.findOneAndUpdate(
        { Guild: interaction.guild.id },
        { RoleID: role.id, Guild: interaction.guild.id },
        { upsert: true }
      );
    } catch (err) {
      return interaction.editReply(`<:closekIcon:1395099724473700544> Failed to save mute role:\n\`${err.message}\``);
    }

    // APPLY PERMISSION OVERWRITES TO ALL CHANNELS
    let success = 0;
    let failed = 0;

    const denyPerms = {
      SendMessages: false,
      SendMessagesInThreads: false,
      AddReactions: false,
      Speak: false,
      Connect: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      SendTTSMessages: false
    };

    for (const [, channel] of interaction.guild.channels.cache) {
      try {
        await channel.permissionOverwrites.edit(role.id, denyPerms);
        success++;
      } catch (e) {
        failed++;
      }
    }

    console.log(`[MuteSetup] Updated ${success} channels, failed: ${failed}, guild ${interaction.guild.id}`);

    return interaction.editReply({
      content: `### <:checkIcon:1395099367333167307> Muted role setup complete!

**Role:** ${role}  
**Channels Updated:** ${success}  
**Failed:** ${failed}  

Your mute system is now fully automatic and ready to use 🔒`,
      ephemeral: true
    });
  }
};
