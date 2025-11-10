const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows the bot's command menu."),

  async execute(interaction) {
    const client = interaction.client;

    // --- Command categories based on your structure ---
    const categories = {
      Developer: [
        "createlink",
        "leaveServer",
        "restart",
        "serverList"
      ],
      Fun: [
        "minigames"
      ],
      Moderation: [
        "adminRole",
        "ban",
        "kick",
        "nickname",
        "purge",
        "say",
        "setupModLogs",
        "timeout",
        "togglelevels",
        "voicemaster",
        "warn"
      ],
      Public: [
        "afk",
        "balance"
      ]
    };

    // Create dropdown options
    const options = Object.keys(categories).map(cat => ({
      label: cat,
      description: `View ${cat} commands.`,
      value: cat
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("Select a category to view commands")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const introEmbed = new EmbedBuilder()
      .setTitle(`${client.user.username}'s Command Menu`)
      .setDescription(
        [
          "Use the dropdown menu below to browse commands.",
          "An asterisk (*) means the command has subcommands.",
          "",
          `Need extra help?\nDeveloper: ${client.application?.owner?.tag || "Unknown"}`
        ].join("\n")
      )
      .setColor("Blue");

    // Send main embed
    const msg = await interaction.reply({
      embeds: [introEmbed],
      components: [row],
      ephemeral: false // visible to everyone
    });

    // Handle dropdown selection
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000
    });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "You can't use this help menu.",
          ephemeral: true
        });
      }

      const cat = i.values[0];
      const cmds = categories[cat] || [];

      const desc = cmds
        .map(name => {
          const cmd = client.commands.get(name);
          const data = cmd?.data;
          const hasSub = data?.options?.some(o => o.type === 1);
          const subMark = hasSub ? "*" : "";
          return `• **/${data?.name || name}${subMark}** — ${data?.description || "No description."}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`${cat} Commands`)
        .setDescription(desc || "No commands found in this category.")
        .setColor("Blue")
        .setFooter({ text: "Select another module to view its commands." });

      await i.update({ embeds: [embed], components: [row] });
    });

    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );
      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  }
};
