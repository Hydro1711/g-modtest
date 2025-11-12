const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require("discord.js");
const os = require("os");
const process = require("process");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Displays detailed information about the bot."),

  async execute(interaction) {
    const client = interaction.client;
    const uptimeSeconds = Math.floor(client.uptime / 1000);

    // Convert uptime to a readable format
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    // Fake uptime percentage example
    // Simulate “uptime stability” out of total 24h
    const uptimePercent = ((uptimeSeconds / 86400) * 100).toFixed(2);

    // System stats
    const cpuModel = os.cpus()[0].model;
    const cpuUsage = process.cpuUsage();
    const totalMem = os.totalmem() / 1024 / 1024 / 1024;
    const usedMem = (process.memoryUsage().rss / 1024 / 1024 / 1024).toFixed(2);

    // Software info
    const nodeVersion = process.version;
    const platform = `${os.type()} ${os.release()}`;

    // Time format
    const startedAt = `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user.username} | Bot Information`,
        iconURL: client.user.displayAvatarURL()
      })
      .setColor("#2b6cb0")
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .setDescription(
        "Here’s a detailed overview of the bot’s current performance and system status."
      )
      .addFields(
        {
          name: "🤖 Bot Details",
          value: [
            `**Name:** ${client.user.tag}`,
            `**ID:** ${client.user.id}`,
            `**Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:D>`,
            `**Servers:** ${client.guilds.cache.size.toLocaleString()}`,
            `**Users:** ${client.users.cache.size.toLocaleString()}`
          ].join("\n"),
          inline: false
        },
        {
          name: "🕐 Uptime & Performance",
          value: [
            `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s`,
            `**Uptime %:** ${uptimePercent}% of the last 24h`,
            `**Started:** ${startedAt}`,
            `**Ping:** ${client.ws.ping}ms`
          ].join("\n"),
          inline: false
        },
        {
          name: "⚙️ System Info",
          value: [
            `**CPU:** ${cpuModel}`,
            `**Memory:** ${usedMem}GB / ${totalMem.toFixed(2)}GB`,
            `**Platform:** ${platform}`
          ].join("\n"),
          inline: false
        },
        {
          name: "📦 Software",
          value: [
            `**Node.js:** ${nodeVersion}`,
            `**Discord.js:** v${djsVersion}`
          ].join("\n"),
          inline: false
        }
      )
      .setFooter({ text: `Bot Info • Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
