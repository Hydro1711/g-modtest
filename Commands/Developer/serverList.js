const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-list')
    .setDescription('📜 Lists all servers the bot is in (aligned table with headers)'),

  async execute(interaction) {
    if (String(interaction.user.id) !== String(config.DeveloperID)) {
      return interaction.reply({
        content: "❌ You are not authorized to use this command.",
        ephemeral: true
      });
    }

    // Sort guilds by member count
    const guilds = interaction.client.guilds.cache
      .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
      .map(guild => {
        const total = guild.memberCount ?? 0;
        const bots = guild.members.cache.filter(m => m.user.bot).size || 0;
        const users = total - bots;

        // truncate long names
        let name = guild.name.length > 32 ? guild.name.slice(0, 29) + "..." : guild.name;

        return { name, id: guild.id, users, bots, total };
      });

    if (guilds.length === 0) {
      return interaction.reply({
        content: "🤷 The bot is not in any servers.",
        ephemeral: true
      });
    }

    // fixed column widths
    const nameWidth = 32;
    const idWidth = 18;
    const numWidth = 6;

    // header
    const header =
      "Server Name".padEnd(nameWidth) +
      " " +
      "(ID)".padEnd(idWidth) +
      " | 👥 Users".padStart(numWidth + 6) +
      " | 🤖 Bots".padStart(numWidth + 6) +
      " | 🌍 Total".padStart(numWidth + 6);

    const separator = "-".repeat(header.length);

    const lines = guilds.map(g =>
      g.name.padEnd(nameWidth) +
      " " +
      `(${g.id})`.padEnd(idWidth) +
      ` | 👥 ${String(g.users).padStart(numWidth)}` +
      ` | 🤖 ${String(g.bots).padStart(numWidth)}` +
      ` | 🌍 ${String(g.total).padStart(numWidth)}`
    );

    // code block for monospace
    const chunks = [];
    let chunk = "```\n" + header + "\n" + separator + "\n";
    for (const line of lines) {
      if ((chunk + line + "\n```").length > 1990) {
        chunk += "```";
        chunks.push(chunk);
        chunk = "```\n" + header + "\n" + separator + "\n";
      }
      chunk += line + "\n";
    }
    chunk += "```";
    chunks.push(chunk);

    await interaction.reply({
      content: `📜 **Server List** (${guilds.length} servers, sorted by members):\n${chunks[0]}`,
      ephemeral: true
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], ephemeral: true });
    }
  }
};
