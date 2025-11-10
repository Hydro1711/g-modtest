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
    .setDescription("Displays the bot's command directory."),

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

    // --- Refined "homepage" embed ---
    const introEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user.username} Command Directory`,
        iconURL: client.user.displayAvatarURL({ size: 256 })
      })
      .setDescription(
        [
          "Welcome to the command menu.",
          "",
          "• Use the dropdown below to browse command categories.",
          "• Commands marked with `*` include subcommands or advanced options.",
          "",
          "This bot provides moderation, fun, and utility features designed to make server management effortless and intuitive.",
          "",
          `Developer: ${client.application?.owner?.tag || "Unknown"}`
        ].join("\n")
      )
      .setColor("#2b6cb0")
      .setFooter({
        text: "Use /help again anytime to reopen this menu."
      });

    // Send main embed
    const msg = await interaction.reply({
      embeds: [introEmbed],
      components: [row],
      ephemeral: false
    });

    // Handle dropdown selection
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000
    });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "You cannot interact with this help menu.",
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
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 })
        })
        .setDescription(desc || "No commands found in this category.")
        .setColor("#2b6cb0")
        .setFooter({
          text: "Select another module to view more commands."
        });

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
