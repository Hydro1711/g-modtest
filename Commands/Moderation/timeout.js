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

    console.log("DEBUG: Slash command invoked by", interaction.user.tag);

    const user = interaction.options.getUser("user");
    const durationInput = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    console.log("DEBUG: Target user:", user.id, user.tag);

    const member = await interaction.guild.members.fetch(user.id).catch(err => {
      console.log("DEBUG: Member fetch error:", err);
      return null;
    });

    console.log("DEBUG: Member resolved:", !!member);

    if (!member)
      return interaction.reply({ content: "❌ Member not found.", ephemeral: true });

    console.log("DEBUG: Bot member permissions:", interaction.guild.members.me.permissions.toArray());
    console.log("DEBUG: Bot highest role position:", interaction.guild.members.me.roles.highest.position);
    console.log("DEBUG: Target highest role position:", member.roles.highest.position);
    console.log("DEBUG: member.moderatable =", member.moderatable);

    if (!member.moderatable) {
      console.log("DEBUG: member.moderatable returned false");
      return interaction.reply({ content: "❌ I cannot timeout this member.", ephemeral: true });
    }

    const durationMs = ms(durationInput);
    console.log("DEBUG: Parsed duration:", durationMs);

    if (!durationMs || durationMs < 10000 || durationMs > 2419200000)
      return interaction.reply({
        content: "❌ Invalid duration. Use between `10s` and `28d`.",
        ephemeral: true,
      });

    console.log("DEBUG: Attempting timeout…");

    try {
      await member.timeout(durationMs, reason);
      console.log("DEBUG: Timeout succeeded");
    } catch (err) {
      console.log("DEBUG: Timeout FAILED:", err);
      return interaction.reply({
        content: "❌ Discord rejected the timeout. Check console logs.",
        ephemeral: true,
      });
    }

    const endTimestamp = Date.now() + durationMs;
    const endsAt = time(Math.floor(endTimestamp / 1000), "F");
    const relative = time(Math.floor(endTimestamp / 1000), "R");

    let totalTimeouts = 1;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
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

    console.log("DEBUG: Sending main reply embed");

    await interaction.reply({ embeds: [embed] });

    const logData = await ModLogs.findOne({ guildId: interaction.guild.id }).catch(e => {
      console.log("DEBUG: ModLogs fetch error:", e);
      return null;
    });

    console.log("DEBUG: logData exists =", !!logData);

    if (logData) {
      const logChannel = interaction.guild.channels.cache.get(logData.channelId);
      console.log("DEBUG: logChannel exists =", !!logChannel);

      if (logChannel?.isTextBased()) {
        console.log("DEBUG: Sending log embed");
        await logChannel.send({ embeds: [embed] }).catch(e => {
          console.log("DEBUG: Log channel send error:", e);
        });
      }
    }
  },
};
