const { GuildMember, EmbedBuilder } = require("discord.js");
const MutedList = require("../../Schemas/mutedList");
const Level = require("../../Schemas/ServerLevel");
const MessageCount = require("../../Schemas/messageCount");

module.exports = {
  name: "guildMemberRemove",
  /**
   * @param {GuildMember} member
   */
  async execute(member, client) {
    const guildConfig = client.guildConfig.get(member.guild.id);
    if (!guildConfig) return;

    const logChannel = (await member.guild.channels.fetch()).get(guildConfig.logChannel);
    if (!logChannel) return;

    const accountCreation = parseInt(member.user.createdTimestamp / 1000);

    if (!logChannel.permissionsFor(client.user).has("SendMessages")) return;

    // === MUTED LIST: do NOT delete user on leave ===
    try {
      const mutedEntry = await MutedList.findOne({ guildId: member.guild.id, userId: member.id });
      if (mutedEntry) {
        console.log(`[MUTE_LEAVE] ${member.user.tag} left while muted in guild ${member.guild.name}`);
      }
    } catch (error) {
      console.error(`[MUTE_LEAVE] Error checking muted list for ${member.user.tag}:`, error);
    }

    // === LEVEL + MESSAGE CLEANUP ===
    try {
      console.log(`[LEAVE_CLEANUP] ${member.user.tag} left ${member.guild.name}. Removing XP & message data...`);

      const levelResult = await Level.deleteOne({
        guildId: member.guild.id,
        userId: member.id,
      });

      const msgResult = await MessageCount.deleteOne({
        guildId: member.guild.id,
        userId: member.id,
      });

      console.log(
        `[LEAVE_CLEANUP] ${member.user.tag}: Level removed: ${levelResult.deletedCount}, Messages removed: ${msgResult.deletedCount}`
      );
    } catch (err) {
      console.error(`[LEAVE_CLEANUP] Error removing ${member.user.tag} from DB:`, err);
    }

    // === LEAVE LOG EMBED ===
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${member.user.tag}`, iconURL: member.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        [
          `• User: ${member.user}`,
          `• Account Type: ${member.user.bot ? "Bot" : "User"}`,
          `• Account Created: <t:${accountCreation}:D> | <t:${accountCreation}:R>`,
        ].join("\n")
      )
      .setFooter({ text: "Left" })
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
