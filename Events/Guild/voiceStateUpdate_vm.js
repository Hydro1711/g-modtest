const VM = require("../../Schemas/voicemaster");
const VcOwner = require("../../Schemas/vcOwner");

module.exports = {
  name: "voiceStateUpdate",
  /**
   * @param {import('discord.js').GuildMember} member
   * @param {import('discord.js').VoiceState} before
   * @param {import('discord.js').VoiceState} after
   */
  async execute(before, after) {
    try {
      const guild = (before || after)?.guild;
      if (!guild) return;

      const cfg = await VM.findOne({ guildId: guild.id });
      if (!cfg) return;

      const joinToCreateId = cfg.joinToCreateChannelId;
      const categoryId = cfg.categoryId;

      // Joined a channel
      if (!before.channelId && after.channelId) {
        if (after.channelId === joinToCreateId) {
          // make a personal channel
          const channel = await guild.channels.create({
            name: `${after.member.displayName}'s lounge`,
            type: 2,
            parent: categoryId,
          });
          await after.member.voice.setChannel(channel.id).catch(() => {});
          await VcOwner.create({ channelId: channel.id, ownerId: after.member.id });
        }
      }

      // Moved channels
      if (before.channelId && after.channelId && before.channelId !== after.channelId) {
        // leaving a temp channel: delete if empty
        const leaving = before.channel;
        if (leaving?.parentId === categoryId && leaving.id !== joinToCreateId) {
          if (leaving.members.size === 0) {
            await VcOwner.deleteOne({ channelId: leaving.id }).catch(() => {});
            await leaving.delete("VoiceMaster: empty temp channel").catch(() => {});
          }
        }

        // joined JTC from somewhere else
        if (after.channelId === joinToCreateId) {
          const channel = await guild.channels.create({
            name: `${after.member.displayName}'s lounge`,
            type: 2,
            parent: categoryId,
          });
          await after.member.voice.setChannel(channel.id).catch(() => {});
          await VcOwner.create({ channelId: channel.id, ownerId: after.member.id });
        }
      }

      // Disconnected from voice
      if (before.channelId && !after.channelId) {
        const leaving = before.channel;
        if (leaving?.parentId === categoryId && leaving.id !== joinToCreateId) {
          if (leaving.members.size === 0) {
            await VcOwner.deleteOne({ channelId: leaving.id }).catch(() => {});
            await leaving.delete("VoiceMaster: empty temp channel").catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("[VoiceMaster] voiceStateUpdate error:", err);
    }
  },
};
