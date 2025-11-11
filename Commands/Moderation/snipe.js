const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

// Cache: channelId → array of deleted messages
const snipes = new Map();

module.exports = {
  // Listener for message deletions (hooked via your event system)
  messageDelete(message) {
    if (!message.guild || message.author?.bot) return;
    const data = {
      author: message.author.tag,
      authorId: message.author.id,
      content: message.content || "*No text content*",
      time: Date.now(),
      attachments: message.attachments.map(a => a.url)
    };
    const arr = snipes.get(message.channel.id) || [];
    arr.unshift(data);
    snipes.set(message.channel.id, arr.slice(0, 5)); // Keep last 5
  },

  // Slash command
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Shows the last deleted messages in this channel."),

  async execute(interaction) {
    const entries = snipes.get(interaction.channel.id);

    if (!entries || entries.length === 0)
      return interaction.reply({ content: "No deleted messages found.", ephemeral: true });

    let index = 0;

    const getEmbed = (entry, idx) =>
      new EmbedBuilder()
        .setAuthor({ name: entry.author })
        .setDescription(entry.content)
        .setColor("Blue")
        .setFooter({ text: `Snipe ${idx + 1} of ${entries.length} • Deleted <t:${Math.floor(entry.time / 1000)}:R>` })
        .setImage(entry.attachments[0] || null)
        .setTimestamp(entry.time);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("⬅️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next").setLabel("➡️").setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({
      embeds: [getEmbed(entries[index], index)],
      components: entries.length > 1 ? [row] : [],
      ephemeral: false
    });

    if (entries.length < 2) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "You can’t control this menu.", ephemeral: true });

      if (i.customId === "next") index = (index + 1) % entries.length;
      else if (i.customId === "prev") index = (index - 1 + entries.length) % entries.length;

      await i.update({
        embeds: [getEmbed(entries[index], index)],
        components: [row]
      });
    });

    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(row.components[0]).setDisabled(true),
        ButtonBuilder.from(row.components[1]).setDisabled(true)
      );
      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  }
};
