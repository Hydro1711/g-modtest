const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");

// Cache: channelId → array of edit snipes
const editSnipes = new Map();

module.exports = {
  // Listener for message edits (hooked via your event system)
  messageUpdate(oldMsg, newMsg) {
    if (!oldMsg.guild || oldMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;

    const data = {
      author: oldMsg.author.tag,
      authorId: oldMsg.author.id,
      before: oldMsg.content || "*Empty message*",
      after: newMsg.content || "*Empty message*",
      time: Date.now()
    };
    const arr = editSnipes.get(oldMsg.channel.id) || [];
    arr.unshift(data);
    editSnipes.set(oldMsg.channel.id, arr.slice(0, 5));
  },

  data: new SlashCommandBuilder()
    .setName("editsnipe")
    .setDescription("Shows the last edited messages in this channel."),

  async execute(interaction) {
    const entries = editSnipes.get(interaction.channel.id);

    if (!entries || entries.length === 0)
      return interaction.reply({ content: "No recent edited messages found.", ephemeral: true });

    let index = 0;

    const getEmbed = (entry, idx) =>
      new EmbedBuilder()
        .setAuthor({ name: entry.author })
        .addFields(
          { name: "Before", value: entry.before.slice(0, 1024) },
          { name: "After", value: entry.after.slice(0, 1024) }
        )
        .setColor("Yellow")
        .setFooter({ text: `Edit Snipe ${idx + 1} of ${entries.length} • Edited <t:${Math.floor(entry.time / 1000)}:R>` })
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
