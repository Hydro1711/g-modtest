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
    .setDescription("Displays all bot commands by category."),

  async execute(interaction) {
    const client = interaction.client;

    // --- Command categories ---
    const categories = {
      Developer: [
        "createlink",
        "leaveServer",
        "restart",
        "serverList"
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
        "warn",
        "mute",
        "unmute",
        "setupMuteRole",
        "mutedlist",
        "snipe",
        "editsnipe"
      ],

      Fun: [
        "8ball",
        "roll",
        "meme",
        "quote",
        "cat",
        "ship",
        "hug",
        "slap",
        "kiss"
      ],

      Public: [
        "ping",
        "userinfo",
        "serverinfo",
        "avatar",
        "botinfo",
        "invite",
        "afk",
        "balance"
      ]
    };

    // Dropdown menu options
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

    // --- Homepage Embed ---
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
          `Developer: ${client.application?.owner?.tag || "Hydro.17"}`
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

    // --- Dropdown collector ---
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
          return `• **/${data?.name || name}${subMark}** — ${data?.description || "No description provided."}`;
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
          text: "Select another category to view more commands."
        });

      await i.update({ embeds: [embed], components: [row] });
    });

    // --- Disable after timeout ---
    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );
      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  }
};
