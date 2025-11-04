const { Events, EmbedBuilder } = require("discord.js");
const ModLogs = require("../../Schemas/modLogs");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      const guild = newState.guild || oldState.guild;
      if (!guild || !member) return;

      const modLog = await ModLogs.findOne({ guildId: guild.id });
      if (!modLog) return;

      const logChannel = guild.channels.cache.get(modLog.channelId);
      if (!logChannel || !logChannel.isTextBased()) return;

      const now = `<t:${Math.floor(Date.now() / 1000)}:F>`;

      const fetchMod = async (actionType) => {
        try {
          const fetched = await guild.fetchAuditLogs({ type: actionType, limit: 1 });
          const entry = fetched.entries.first();
          if (entry && entry.target?.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
            return entry.executor;
          }
        } catch (err) {
          return null;
        }
      };

      // JOIN
      if (!oldState.channelId && newState.channelId) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`📥 <@${member.id}> **joined** <#${newState.channelId}>`)
          .addFields({ name: "Time", value: now })
          .setColor("Green");

        return logChannel.send({ embeds: [embed] });
      }

      // LEAVE
      if (oldState.channelId && !newState.channelId) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`📤 <@${member.id}> **left** <#${oldState.channelId}>`)
          .addFields({ name: "Time", value: now })
          .setColor("Red");

        return logChannel.send({ embeds: [embed] });
      }

      // SWITCH CHANNEL
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(`🔁 <@${member.id}> **moved from** <#${oldState.channelId}> **to** <#${newState.channelId}>`)
          .addFields({ name: "Time", value: now })
          .setColor("Orange");

        return logChannel.send({ embeds: [embed] });
      }

      // SERVER MUTE
      if (oldState.serverMute !== newState.serverMute) {
        const mod = await fetchMod(24); // MEMBER_UPDATE
        const embed = new EmbedBuilder()
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(
            newState.serverMute
              ? `🔇 <@${member.id}> was **server muted**`
              : `🔊 <@${member.id}> was **server unmuted**`
          )
          .addFields(
            { name: "Time", value: now, inline: true },
            { name: "Moderator", value: mod ? `<@${mod.id}>` : "Unknown", inline: true }
          )
          .setColor(newState.serverMute ? "Red" : "Green");

        return logChannel.send({ embeds: [embed] });
      }

      // SERVER DEAFEN
      if (oldState.serverDeaf !== newState.serverDeaf) {
        const mod = await fetchMod(24); // MEMBER_UPDATE
        const embed = new EmbedBuilder()
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(
            newState.serverDeaf
              ? `🧏 <@${member.id}> was **server deafened**`
              : `🗣️ <@${member.id}> was **server undeafened**`
          )
          .addFields(
            { name: "Time", value: now, inline: true },
            { name: "Moderator", value: mod ? `<@${mod.id}>` : "Unknown", inline: true }
          )
          .setColor(newState.serverDeaf ? "Red" : "Green");

        return logChannel.send({ embeds: [embed] });
      }

      // VIDEO ON/OFF
      if (oldState.selfVideo !== newState.selfVideo) {
        const mod = await fetchMod(24); // MEMBER_UPDATE (still best guess for video force disable)
        const embed = new EmbedBuilder()
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setDescription(
            newState.selfVideo
              ? `📹 <@${member.id}> **enabled video**`
              : `📷 <@${member.id}> **disabled video**`
          )
          .addFields(
            { name: "Time", value: now, inline: true },
            { name: "Moderator", value: mod ? `<@${mod.id}>` : "May be self-disabled", inline: true }
          )
          .setColor(newState.selfVideo ? "Green" : "Red");

        return logChannel.send({ embeds: [embed] });
      }

      // USER MOVED OUT OF VC BY MOD
      if (
        oldState.channelId &&
        !newState.channelId &&
        oldState.channel &&
        !oldState.channel.members.has(member.id)
      ) {
        const mod = await fetchMod(26); // MEMBER_DISCONNECT
        if (mod) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
            .setDescription(`🚫 <@${member.id}> was **disconnected** from VC`)
            .addFields(
              { name: "From Channel", value: `<#${oldState.channelId}>`, inline: true },
              { name: "Moderator", value: `<@${mod.id}>`, inline: true },
              { name: "Time", value: now, inline: true }
            )
            .setColor("Red");

          return logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error("❌ VoiceStateUpdate Error:", error);
    }
  },
};
