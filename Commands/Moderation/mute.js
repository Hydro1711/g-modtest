const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  userMention,
} = require("discord.js");
const MuteRoleDB = require("../../Schemas/muteRole");
const MutedList = require("../../Schemas/mutedList");
const ModInteraction = require("../../Schemas/modInteractions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a member permanently")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // ✅ changed permission
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Select the member to mute")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for the mute")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const closeIcon = "<:closekIcon:1395099724473700544>";
    const muteIcon = "<:muteIcon:1395102317971509408>";

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return interaction.editReply({ content: `${closeIcon} You need the **Moderate Members** permission to use this.` });

    const targetUser = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (!targetUser)
      return interaction.editReply({ content: `${closeIcon} User not found.` });

    let member;
    try {
      member = await interaction.guild.members.fetch(targetUser.id, { force: true });
    } catch {
      return interaction.editReply({ content: `${closeIcon} Could not fetch that member.` });
    }

    if (!member)
      return interaction.editReply({ content: `${closeIcon} Member not found.` });

    if (member.id === interaction.user.id)
      return interaction.editReply({ content: `${closeIcon} You cannot mute yourself.` });

    if (
      member.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.user.id !== interaction.guild.ownerId
    )
      return interaction.editReply({ content: `${closeIcon} You cannot mute someone with an equal or higher role.` });

    if (!member.manageable)
      return interaction.editReply({ content: `${closeIcon} I cannot manage this member.` });

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return interaction.editReply({ content: `${closeIcon} I need the **Manage Roles** permission to do that.` });

    const muteData = await MuteRoleDB.findOne({ Guild: interaction.guild.id });
    if (!muteData?.RoleID)
      return interaction.editReply({ content: `${closeIcon} The muted role has not been set up yet.` });

    const muteRole = interaction.guild.roles.cache.get(muteData.RoleID);
    if (!muteRole)
      return interaction.editReply({ content: `${closeIcon} The muted role no longer exists.` });

    if (muteRole.position >= interaction.guild.members.me.roles.highest.position)
      return interaction.editReply({ content: `${closeIcon} My role must be higher than the muted role.` });

    if (member.roles.cache.has(muteRole.id))
      return interaction.editReply({ content: `${closeIcon} This member is already muted.` });

    try {
      await member.roles.add(muteRole);

      await MutedList.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: member.id },
        {
          guildId: interaction.guild.id,
          userId: member.id,
          reason,
          moderatorId: interaction.user.id,
          mutedAt: new Date(),
        },
        { upsert: true }
      );

      await ModInteraction.create({
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        action: "mute",
        targetId: member.id,
        targetTag: member.user.tag,
        reason,
        details: "Permanent mute",
        date: new Date(),
      });
    } catch (err) {
      console.error("Failed to mute member:", err);
      return interaction.editReply({ content: `${closeIcon} Failed to mute: ${err.message}` });
    }

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${muteIcon} You have been muted in ${interaction.guild.name}`)
      .setColor("Red")
      .setDescription(`**Reason:** ${reason}\nPlease follow the server rules.`)
      .setTimestamp();

    try {
      await member.send({ embeds: [dmEmbed] });
    } catch {
      console.warn(`⚠️ Could not DM ${member.user.tag} about their mute.`);
    }

    const successEmbed = new EmbedBuilder()
      .setTitle(`Member Muted ${muteIcon}`)
      .setColor("Red")
      .setDescription(`${userMention(member.id)} has been muted.\n**Reason:** ${reason}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
  },
};
