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
    console.log("AFK DEBUG: Command invoked by", interaction.user.tag);

    const reason = interaction.options.getString("reason") || "AFK";

    if (reason.length > 2000) {
      return interaction.reply({
        content: "❌ Your AFK reason is too long! Please keep it under 2000 characters.",
        ephemeral: true,
      });
    }

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const member = interaction.member;
    const botMember = interaction.guild.members.me;

    console.log("AFK DEBUG: Target user nickname =", member.nickname);
    console.log("AFK DEBUG: Bot nickname =", botMember.nickname);
    console.log("AFK DEBUG: Bot permissions =", botMember.permissions.toArray());
    console.log("AFK DEBUG: Bot highest role position =", botMember.roles.highest.position);
    console.log("AFK DEBUG: User highest role position =", member.roles.highest.position);

    const hasAdmin = botMember.permissions.has(PermissionsBitField.Flags.Administrator);
    const hasManageNick = botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames);
    const botAboveUser = botMember.roles.highest.position > member.roles.highest.position;

    console.log("AFK DEBUG: hasAdmin =", hasAdmin);
    console.log("AFK DEBUG: hasManageNick =", hasManageNick);
    console.log("AFK DEBUG: botAboveUser =", botAboveUser);

    const missingNicknamePermission = !hasManageNick && !hasAdmin;

    console.log("AFK DEBUG: missingNicknamePermission =", missingNicknamePermission);

    if (missingNicknamePermission || !botAboveUser) {
      console.log("AFK DEBUG: Permission or hierarchy check failed");

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

    console.log("AFK DEBUG: Passed permission check. Updating DB…");

    await AfkModel.findOneAndUpdate(
      { userId, guildId },
      { reason, timestamp: new Date() },
      { upsert: true }
    );

    try {
      const originalName = member.nickname || member.user.username;
      console.log("AFK DEBUG: originalName =", originalName);

      if (!originalName.startsWith("[AFK]")) {
        const newNickname = `[AFK] ${originalName}`;
        console.log("AFK DEBUG: Attempting nickname change →", newNickname);

        await member.setNickname(newNickname).catch(err => {
          console.log("AFK DEBUG: Nickname change rejected:", err.message);
        });
      } else {
        console.log("AFK DEBUG: Name already has AFK prefix, skipping nickname set");
      }
    } catch (err) {
      console.log("AFK DEBUG: Nickname change threw error:", err);
    }

    console.log("AFK DEBUG: Sending AFK confirmation message");

    return interaction.reply({
      content: `✅ You are now AFK${reason ? `: **${reason}**` : ""}.`,
      ephemeral: true,
    });
  },
};
