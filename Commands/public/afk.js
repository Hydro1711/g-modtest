const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const AfkModel = require("../../Schemas/afk");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status")
    .addStringOption(option =>
      option.setName("reason").setDescription("Reason for going AFK").setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString("reason") || "AFK";

    if (reason.length > 2000) {
      return interaction.reply({
        content: "❌ Your AFK reason is too long! Please keep it under 2000 characters.",
        ephemeral: true,
      });
    }

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const member = interaction.member;                  // user
    const botMember = interaction.guild.members.me;     // bot



    const hasAdmin = botMember.permissions.has(PermissionsBitField.Flags.Administrator);
    const hasManageNick = botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames);
    const botAboveUser = botMember.roles.highest.position > member.roles.highest.position;

    // In new Discord update Admin does NOT bypass granular nickname perms
    const missingNicknamePermission = !hasManageNick && !hasAdmin;

    // If bot cannot change nickname safely
    if (missingNicknamePermission || !botAboveUser) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Missing Permissions")
        .setDescription(
          [
            "**I cannot modify your nickname.**",
            "This may be caused by:",
            "",
            `• I am **missing Manage Nicknames** permission`,
            `• My role is **not above** your highest role`,
            `• Discord’s new granular permission update requires explicit nickname permission`,
            "",
            "Please ensure my bot role:",
            "✔ Has **Manage Nicknames** enabled",
            "✔ Is **at the top** of the role list",
          ].join("\n")
        )
        .setColor(0xff0000);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }


    await AfkModel.findOneAndUpdate(
      { userId, guildId },
      { reason, timestamp: new Date() },
      { upsert: true }
    );
    try {
      const originalName = member.nickname || member.user.username;

      if (!originalName.startsWith("[AFK]")) {
        const newNickname = `[AFK] ${originalName}`;

        await member.setNickname(newNickname).catch(() => {
          // fallback if Discord still blocks nickname change
        });
      }
    } catch (err) {
      console.warn(`⚠️ Nickname change failed for ${member.user.tag}: ${err.message}`);
    }

    return interaction.reply({
      content: `✅ You are now AFK${reason ? `: **${reason}**` : ""}.`,
      ephemeral: true,
    });
  },
};
