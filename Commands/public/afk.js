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

    // Check if reason is too long
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

    // Check nickname change permissions
    if (
      !botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames) ||
      member.roles.highest.position >= botMember.roles.highest.position
    ) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Missing Permissions")
        .setDescription("I don't have permission to change your nickname.\nMake sure I have the **Manage Nicknames** permission and my role is higher than yours.")
        .setColor(0xFF0000);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      console.warn(`❌ Missing permissions to change nickname for ${member.user.tag}`);
      return;
    }

    // Save AFK status in DB
    await AfkModel.findOneAndUpdate(
      { userId, guildId },
      { reason, timestamp: new Date() },
      { upsert: true }
    );

    // Change nickname
    try {
      const originalName = member.displayName;
      if (!originalName.startsWith("[AFK]")) {
        const newName = `[AFK] ${originalName}`;
        await member.setNickname(newName);
        console.log(`✅ Nickname changed for ${member.user.tag} -> ${newName}`);
      } else {
        console.log(`ℹ️ ${member.user.tag} already has [AFK] prefix.`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to change nickname for ${member.user.tag}: ${error.message}`);
    }

    // Final response
    await interaction.reply({
      content: `✅ You are now AFK${reason ? `: **${reason}**` : ""}. I will notify when someone mentions you.`,
      ephemeral: true,
    });

    console.log(`💤 ${interaction.user.tag} is now AFK${reason ? `: ${reason}` : ""}`);
  },
};
