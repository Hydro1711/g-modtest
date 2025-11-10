const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const os = require("os");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Shows info about the bot."),
  async execute(interaction) {
    const client = interaction.client;
    const uptime = Math.floor(client.uptime / 1000);
    const embed = new EmbedBuilder()
      .setTitle("Bot Information")
      .setColor("Blue")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "Bot Name", value: client.user.tag, inline: true },
        { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
        { name: "Users", value: `${client.users.cache.size}`, inline: true },
        { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
        { name: "Uptime", value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
        { name: "System", value: `${os.type()} ${os.release()}`, inline: true }
      )
      .setFooter({ text: "Bot Info" });

    await interaction.reply({ embeds: [embed] });
  },
};
