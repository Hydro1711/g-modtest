const { EmbedBuilder, Colors } = require("discord.js");
const MutedList = require("../../Schemas/mutedList");

module.exports = {
  name: "mutedlist",
  description: "Shows a list of currently muted users",
  prefix: true, // prefix command

  async execute(message, args, client) {
    // Permission check: anyone who can Moderate Members
    if (!message.member.permissions.has("ModerateMembers")) {
      return message.channel.send(
        "❌ You need the Moderate Members permission to use this command."
      );
    }

    try {
      // Fetch all muted users for this guild
      const mutedUsers = await MutedList.find({ guildId: message.guild.id });
      if (!mutedUsers || mutedUsers.length === 0) {
        return message.channel.send("✅ No muted users found.");
      }

      const chunks = [];
      let currentChunk = "";

      // Split into multiple messages to stay under Discord limit
      for (let i = 0; i < mutedUsers.length; i++) {
        const m = mutedUsers[i];
        const line = `${i + 1}. <@${m.userId}> | Reason: ${m.reason || "No reason"} | Muted by: <@${m.moderatorId}>\n`;

        if ((currentChunk + line).length > 1800) { // safe margin under 2000
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk += line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      // Send each chunk as a separate embed
      for (let i = 0; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
          .setTitle(`Muted Users in ${message.guild.name}${chunks.length > 1 ? ` (Page ${i + 1}/${chunks.length})` : ""}`)
          .setDescription(chunks[i])
          .setColor(Colors.Orange) // ✅ fixed
          .setTimestamp();

        await message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("Error fetching muted users:", err);
      return message.channel.send("❌ Failed to fetch muted users.");
    }
  },
};
