const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse all bot commands by category."),

  async execute(interaction) {
    const client = interaction.client;

    const categories = {
      Developer: [
        "createlink",
        "leaveServer",
        "restart",
        "serverList",
        "reload",
        "reset_levels"
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
        "editsnipe",
        "takechips",
        "altscanner"
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

    const options = Object.keys(categories).map((cat) => ({
      label: cat,
      description: `View ${cat} commands.`,
      value: cat,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("📂 Select a category to view commands")
      .addOptions(options);

    const homeBtn = new ButtonBuilder()
      .setCustomId("help-home")
      .setStyle(ButtonStyle.Primary)
      .setLabel("🏠 Homepage");

    const row = new ActionRowBuilder().addComponents(menu);
    const homeRow = new ActionRowBuilder().addComponents(homeBtn);

    const introEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user.username} Help Center`,
        iconURL: client.user.displayAvatarURL({ size: 256 }),
      })
      .setDescription(
        [
          "### 👋 Welcome to the Help Menu!",
          "Browse all available commands, neatly organized by category.",
          "",
          "📁 **Categories:**",
          "• Developer — Owner-only tools",
          "• Moderation — Server management commands",
          "• Fun — Entertainment & roleplay",
          "• Economy — Casino & money system",
          "• Public — General utilities & info",
          "",
          "Use the **dropdown below** to view commands.",
          "",
          `> 👑 Developer: ${client.application?.owner?.tag || "Hydro.17"}`
        ].join("\n")
      )
      .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
      .setColor("#3b82f6")
      .setFooter({
        text: "Use /help anytime to reopen this menu.",
      })
      .setTimestamp();

    const msg = await interaction.reply({
      embeds: [introEmbed],
      components: [row],
      ephemeral: false,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
    });

    const buttonCollector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "❌ Not your menu.", ephemeral: true });

      await i.deferUpdate();

      const cat = i.values[0];
      const cmds = categories[cat] || [];

      const desc = cmds
        .map((name) => {
          const cmd = client.commands.get(name);
          const description = (cmd?.data?.description || "No description available.")
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
          return `• **/${cmd?.data?.name || name}** — ${description}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 }),
        })
        .setDescription(desc)
        .setColor("#3b82f6")
        .setFooter({
          text: "Select another category or return to homepage.",
        });

      await msg.edit({ embeds: [embed], components: [row, homeRow] }).catch(() => {});
    });

    buttonCollector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "❌ Not your menu.", ephemeral: true });

      if (i.customId !== "help-home") return;

      await i.deferUpdate();

      await msg.edit({
        embeds: [introEmbed],
        components: [row],
      }).catch(() => {});
    });

    collector.on("end", async () => {
      buttonCollector.stop();

      const disabledRow = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );

      const disabledHome = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(homeBtn).setDisabled(true)
      );

      await msg.edit({
        components: [disabledRow, disabledHome],
      }).catch(() => {});
    });
  },
};
