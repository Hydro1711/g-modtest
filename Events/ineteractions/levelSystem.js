const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const ServerLevel = require("../../Schemas/ServerLevel.js");
const GlobalLevel = require("../../Schemas/GlobalLevel.js");
const GuildSettings = require("../../Schemas/GuildSettings.js");

const xpCooldown = new Map();

function getLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      if (!message.guild || message.author.bot) return;

      const guildConfig = await GuildSettings.findOne({ guildId: message.guild.id });
      if (guildConfig && guildConfig.levelsEnabled === false) return;

      const key = `${message.guild.id}-${message.author.id}`;
      const now = Date.now();

      if (xpCooldown.has(key) && now - xpCooldown.get(key) < 10000) return;
      xpCooldown.set(key, now);

      let xpGain = Math.floor(Math.random() * 11) + 15;
      if (message.member.premiumSince) xpGain = Math.floor(xpGain * 1.5);

      let serverXpData = await ServerLevel.findOne({ guildId: message.guild.id, userId: message.author.id });
      if (!serverXpData) {
        serverXpData = new ServerLevel({ guildId: message.guild.id, userId: message.author.id, xp: 0 });
      }

      const oldLevel = getLevel(serverXpData.xp);
      serverXpData.xp += xpGain;
      await serverXpData.save();
      const newLevel = getLevel(serverXpData.xp);

      if (newLevel > oldLevel) {
        let reward = Math.random() * (0.04 - 0.01) + 0.01;
        if (message.member.premiumSince) reward *= 1.5;
        reward = parseFloat(reward.toFixed(2));

        let globalData = await GlobalLevel.findOne({ userId: message.author.id });
        if (!globalData) {
          globalData = new GlobalLevel({ userId: message.author.id, balance: 0 });
        }
        globalData.balance += reward;
        await globalData.save();

        const botMember = message.guild.members.me;
        const permissions = message.channel.permissionsFor(botMember);
        if (!permissions?.has(PermissionsBitField.Flags.SendMessages)) return;

        const embed = new EmbedBuilder()
          .setColor("#ffffff")
          .setTitle("🎉 Level Up!")
          .setDescription(`${message.author} reached **Level ${newLevel}**!\n💰 You earned **$${reward}** globally!`);

        let sendChannel = message.channel;
        if (guildConfig?.levelUpChannelId) {
          const targetChannel = message.guild.channels.cache.get(guildConfig.levelUpChannelId);
          if (targetChannel && targetChannel.permissionsFor(botMember)?.has("SendMessages")) {
            sendChannel = targetChannel;
          }
        }

        await sendChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("Error in level system:", err);
    }
  },
};
