const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  userMention,
} = require("discord.js");
const MuteRoleDB = require("../../Schemas/muteRole");
const MutedList = require("../../Schemas/mutedList");
const MutedUsersDB = require("../../Schemas/userRoles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName("user").setDescription("Select member to unmute").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const closeIcon = "<:closekIcon:1395099724473700544>";
    const unmuteIcon = "<:unmuteIcon:1395102309062541424>";

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return interaction.editReply({ content: `${closeIcon} You need ModerateMembers permission.` });

    const targetUser = interaction.options.getUser("user");
    if (!targetUser)
      return interaction.editReply({ content: `${closeIcon} User not found.` });

    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id, { force: true });
    } catch {
      return interaction.editReply({ content: `${closeIcon} Could not fetch member.` });
    }

    if (!member)
      return interaction.editReply({ content: `${closeIcon} Member not found.` });

    const muteData = await MuteRoleDB.findOne({ Guild: interaction.guild.id });
    if (!muteData?.RoleID)
      return interaction.editReply({ content: `${closeIcon} Muted role not set up.` });

    const muteRole = interaction.guild.roles.cache.get(muteData.RoleID);
    if (!muteRole)
      return interaction.editReply({ content: `${closeIcon} Muted role not found.` });

    if (!member.roles.cache.has(muteRole.id))
      return interaction.editReply({ content: `${closeIcon} Member is not muted.` });

    try {
      await member.roles.remove(muteRole);
      await MutedList.deleteOne({ guildId: interaction.guild.id, userId: member.id });
      await MutedUsersDB.deleteOne({ guildId: interaction.guild.id, userId: member.id });

      await ModInteraction.create({
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        action: "unmute",
        targetId: member.id,
        targetTag: member.user.tag,
        details: "Removed mute role and DB entries",
        date: new Date(),
      });
    } catch (err) {
      console.error("Failed to unmute member:", err);
      return interaction.editReply({ content: `${closeIcon} Failed to unmute: ${err.message}` });
    }

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${unmuteIcon} You have been unmuted in ${interaction.guild.name}`)
      .setColor("Green")
      .setDescription("Please continue to follow the server rules.")
      .setTimestamp();

    try {
      await member.send({ embeds: [dmEmbed] });
    } catch {}

    const successEmbed = new EmbedBuilder()
      .setTitle(`Member Unmuted ${unmuteIcon}`)
      .setColor("Green")
      .setDescription(`${userMention(member.id)} has been successfully unmuted.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
  },
};

