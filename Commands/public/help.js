const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse all bot commands by category."),

  async execute(interaction) {
    const client = interaction.client;

    // ✔ FIXED: All categories corrected to match REAL command names
    const categories = {
      Home: [],

      Developer: [
        "createlink",
        "leaveserver",
        "restart",
        "server-list",
        "reload",
        "reset_levels",
        "resetallchips"
      ],

      Moderation: [
        "admin-role",
        "ban",
        "kick",
        "nickname",
        "purge",
        "say",
        "setup_modlogs",
        "timeout",
        "togglelevels",
        "voicemaster",
        "warn",
        "mute",
        "unmute",
        "setup_mute_role",
        "mutedlist",
        "snipe",
        "editsnipe",
        "takechips",
        "altscanner",
        "setup_casino_channel"
      ],

      Fun: [
        "8ball",
        "meme",
        "quote",
        "ship",
        "hug",
        "slap",
        "kiss",
        "smoke",
        "minigame"
      ],

      Economy: [
        "wallet",
        "slot",
        "roulette",
        "mines",
        "claim",
        "give",
        "resetallchips",
        "setup_casino_channel"
      ],

      Public: [
        "ping",
        "userinfo",
        "serverinfo",
        "avatar",
        "botinfo",
        "invite",
        "afk",
        "crypto",
        "spotify",
        "tts",
        "help"
      ]
    };

    // dropdown category options
    const options = Object.keys(categories).map((cat) => ({
      label: cat,
      description: `View ${cat} commands`,
      value: cat,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("📂 Select a category")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    // HOME EMBED
    const homeEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user.username} Help Center`,
        iconURL: client.user.displayAvatarURL({ size: 256 }),
      })
      .setDescription(
        [
          "### 👋 Welcome to the Help Menu!",
          "Browse all available commands by choosing a category below.",
          "",
          "📁 **Categories:**",
          "• Developer — Owner-only tools",
          "• Moderation — Server management commands",
          "• Fun — Entertainment & roleplay",
          "• Economy — Casino & chip system",
          "• Public — General utilities & info",
          "",
          "Use the **dropdown below** to switch categories.",
          "",
          `> 👑 Developer: ${client.application?.owner?.tag || "Developer"}`
        ].join("\n")
      )
      .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
      .setColor("#3b82f6")
      .setFooter({ text: "Use /help anytime to reopen this menu." })
      .setTimestamp();

    // send initial menu
    const msg = await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
    });

    // collector
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "❌ Not your menu.", ephemeral: true });

      const cat = i.values[0];

      // HOME PAGE
      if (cat === "Home") {
        await i.update({
          embeds: [homeEmbed],
          components: [row],
        });
        return;
      }

      const cmds = categories[cat];

      // FIXED: No errors if command missing
      const desc = cmds
        .map((cmdName) => {
          const cmd = client.commands.get(cmdName);
          const description =
            cmd?.data?.description || "No description available.";

          return `• **/${cmdName}** — ${description}`;
        })
        .join("\n") || "*No commands in this category.*";

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 }),
        })
        .setDescription(desc)
        .setColor("#3b82f6")
        .setFooter({ text: "Select another category from the dropdown." });

      await i.update({
        embeds: [embed],
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );
      await msg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
