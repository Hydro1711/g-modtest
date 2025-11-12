const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Displays a detailed overview of this server."),

  async execute(interaction) {
    const { guild } = interaction;
    await guild.fetch(); // Ensure latest data

    const icon = guild.iconURL({ size: 512, dynamic: true });
    const banner = guild.bannerURL({ size: 1024 });
    const splash = guild.splashURL({ size: 1024 });

    const owner = await guild.fetchOwner().catch(() => null);

    // Channel counts by type
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
    const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const threadChannels = channels.filter(c => c.isThread()).size;

    // Emoji & sticker counts
    const emojis = guild.emojis.cache;
    const emojiCount = emojis.size;
    const animatedEmojis = emojis.filter(e => e.animated).size;
    const stickers = guild.stickers.cache.size;

    // Boost info
    const boostLevel = guild.premiumTier ? `Level ${guild.premiumTier}` : "None";
    const boostCount = guild.premiumSubscriptionCount || 0;

    // Verification level names
    const verificationLevels = {
      0: "None",
      1: "Low",
      2: "Medium",
      3: "High",
      4: "Very High"
    };

    // Time formatting
    const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> • <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;

    // Roles
    const totalRoles = guild.roles.cache.size;
    const topRoles = guild.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r)
      .slice(0, 10)
      .join(" ") || "None";

    // Nitro status
    const boostIcon = boostCount > 0 ? "⚡" : "💤";

    // System & AFK channels
    const afkChannel = guild.afkChannel ? `<#${guild.afkChannelId}>` : "None";
    const systemChannel = guild.systemChannel ? `<#${guild.systemChannelId}>` : "None";

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${guild.name} | Server Information`,
        iconURL: icon || interaction.client.user.displayAvatarURL()
      })
      .setColor("#2b6cb0")
      .setThumbnail(icon)
      .setDescription(
        `**${guild.name}** was created on ${createdAt}.\n` +
        `Owned by ${owner ? owner.user.tag : "Unknown"}.`
      )
      .addFields(
        { name: "🆔 Identifier", value: `\`${guild.id}\``, inline: true },
        { name: "👑 Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
        { name: "🔒 Verification Level", value: verificationLevels[guild.verificationLevel], inline: true },

        { name: "👥 Members", value: `${guild.memberCount.toLocaleString()}`, inline: true },
        { name: "📢 Channels", value: [
          `💬 Text: ${textChannels}`,
          `🔊 Voice: ${voiceChannels}`,
          `🎙️ Stage: ${stageChannels}`,
          `🧵 Threads: ${threadChannels}`,
          `📂 Categories: ${categories}`
        ].join("\n"), inline: true },
        { name: "🎭 Roles", value: `${totalRoles} total`, inline: true },

        { name: "🌟 Boost Info", value: `${boostIcon} ${boostLevel}\nBoosts: ${boostCount}`, inline: true },
        { name: "🕓 AFK Channel", value: afkChannel, inline: true },
        { name: "⚙️ System Channel", value: systemChannel, inline: true },

        { name: "😀 Emojis / Stickers", value: `${emojiCount} emojis (${animatedEmojis} animated)\n${stickers} stickers`, inline: true },
        { name: "🎨 Top Roles", value: topRoles, inline: false }
      )
      .setFooter({ text: `Server Info • ${guild.name}` })
      .setTimestamp();

    if (banner) embed.setImage(banner);
    else if (splash) embed.setImage(splash);

    await interaction.reply({ embeds: [embed] });
  },
};
