const { EmbedBuilder } = require("discord.js");
const MutedList = require("../Schemas/mutedList");

/**
 * Updates or posts a message listing all muted members for a guild.
 * @param {Guild} guild - The Discord guild object
 * @param {TextChannel} logChannel - The channel where muted users are listed
 */
async function updateMutedListMessage(guild, logChannel) {
  try {
    if (!guild || !logChannel) return;

    // Fetch all currently muted users from database
    const mutedUsers = await MutedList.find({ guildId: guild.id });
    if (!mutedUsers.length) {
      await logChannel.send("✅ No muted members currently.");
      return;
    }

    const lines = mutedUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> — ${u.reason || "No reason"}`);
    const embed = new EmbedBuilder()
      .setTitle(`🔇 Muted Members (${mutedUsers.length})`)
      .setDescription(lines.join("\\n"))
      .setColor("DarkGrey")
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[updateMutedListMessage] Error:", err);
  }
}

module.exports = updateMutedListMessage;
