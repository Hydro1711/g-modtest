const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  userMention,
  time,
} = require("discord.js");
const ms = require("ms");
const ModLogs = require("../../Schemas/modLogs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member for a specific duration.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("The member to timeout")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("duration")
        .setDescription("How long? Example: 10m, 1h, 1d")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const durationInput = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: "❌ Member not found.", ephemeral: true });

    if (!member.moderatable)
      return interaction.reply({ content: "❌ I cannot timeout this member.", ephemeral: true });

    const durationMs = ms(durationInput);
    if (!durationMs || durationMs < 10000 || durationMs > 2419200000)
      return interaction.reply({
        content: "❌ Invalid duration. Use between `10s` and `28d`.",
        ephemeral: true,
      });

    // Timeout user
    await member.timeout(durationMs, reason);

    const endTimestamp = Date.now() + durationMs;
    const endsAt = time(Math.floor(endTimestamp / 1000), "F"); // Full date
    const relative = time(Math.floor(endTimestamp / 1000), "R"); // Relative time

    // (Optional) Fetch user’s total timeouts if you track them
    let totalTimeouts = 1; // placeholder
    // You could store in DB if desired

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f) // gold color
      .setTitle("⏳ Member Timed Out")
      .setDescription(`${userMention(user.id)} has been timed out.`)
      .addFields(
        { name: "Duration", value: `\`${durationInput}\``, inline: true },
        { name: "Reason", value: reason, inline: true },
        { name: "Ends At", value: `${endsAt} (${relative})`, inline: false },
        { name: "Total Timeouts", value: `${totalTimeouts}`, inline: true },
        { name: "Action by", value: `${interaction.user.tag}`, inline: true }
      )
      .setFooter({ text: `User ID: ${user.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log to mod channel if configured
    const logData = await ModLogs.findOne({ guildId: interaction.guild.id });
    if (logData) {
      const logChannel = interaction.guild.channels.cache.get(logData.channelId);
      if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] });
    }
  },
};
