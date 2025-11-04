const { EmbedBuilder } = require("discord.js");
const WelcomeLeave = require("../../Schemas/welcomeLeave");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    try {
      const data = await WelcomeLeave.findOne({ guildId: member.guild.id });
      if (!data?.welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(data.welcomeChannelId);
      if (!channel) return;

      // Fetch current invites
      const newInvites = await member.guild.invites.fetch().catch(() => {});
      const oldInvites = member.client.invites.get(member.guild.id);

      // Find which invite increased
      const invite = newInvites.find(i => {
        const oldUses = oldInvites.get(i.code);
        return oldUses < i.uses;
      });

      // Update cache
      member.client.invites.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

      let inviterText = "Unknown";
      if (invite && invite.inviter) {
        inviterText = `${invite.inviter.tag} (Total Invites: ${invite.uses})`;
      }

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("👋 Welcome!")
        .setDescription(
          `Welcome to **${member.guild.name}**, ${member}!\n\nInvited by: **${inviterText}**`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("[guildMemberAdd] Error sending welcome:", err);
    }
  },
};
