const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require("discord.js");
const os = require("os");
const process = require("process");

const OWNER_ID = "582502664252686356";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("Displays internal bot health and system status (owner only)."),

  async execute(interaction) {
    // Owner lock
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    const client = interaction.client;

    // Uptime
    const uptimeSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    // Performance
    const ping = client.ws.ping;
    const cpuModel = os.cpus()[0].model;
    const cpuCores = os.cpus().length;

    // Memory
    const memUsage = process.memoryUsage();
    const usedMem = (memUsage.rss / 1024 / 1024).toFixed(2);
    const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    // System
    const nodeVersion = process.version;
    const platform = `${os.type()} ${os.release()}`;
    const startedAt = `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Bot Health Monitor",
        iconURL: client.user.displayAvatarURL()
      })
      .setColor("#16a34a")
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .setDescription("Internal health check for runtime, system load, and core metrics.")
      .addFields(
        {
          name: "🟢 Runtime Status",
          value: [
            `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s`,
            `**Started:** ${startedAt}`,
            `**WebSocket Ping:** ${ping}ms`
          ].join("\n"),
          inline: false
        },
        {
          name: "🧠 Memory Usage",
          value: [
            `**RSS:** ${usedMem} MB`,
            `**Heap:** ${heapUsed} MB / ${heapTotal} MB`,
            `**System RAM:** ${totalMem} GB`
          ].join("\n"),
          inline: false
        },
        {
          name: "⚙️ System",
          value: [
            `**CPU:** ${cpuModel}`,
            `**Cores:** ${cpuCores}`,
            `**Platform:** ${platform}`
          ].join("\n"),
          inline: false
        },
        {
          name: "📦 Software",
          value: [
            `**Node.js:** ${nodeVersion}`,
            `**Discord.js:** v${djsVersion}`,
            `**Guilds:** ${client.guilds.cache.size}`,
            `**Users Cached:** ${client.users.cache.size}`
          ].join("\n"),
          inline: false
        }
      )
      .setFooter({ text: "Health • Owner Only" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
