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

    const categories = {
      Home: [], // homepage category (no commands, shows intro)

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
      description: `View ${cat} commands`,
      value: cat,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("📂 Select a category")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    // --- HOMEPAGE EMBED ---
    const homeEmbed = new EmbedBuilder()
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
          "Use the **dropdown below** to switch categories.",
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

    // SEND STARTING PAGE (Home)
    const msg = await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
      ephemeral: false,
    });

    // Collector for dropdown
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id)
        return i.reply({ content: "❌ Not your menu.", ephemeral: true });

      await i.deferUpdate();

      const cat = i.values[0];

      // If "Home" selected → show homepage again
      if (cat === "Home") {
        await msg.edit({
          embeds: [homeEmbed],
          components: [row],
        });
        return;
      }

      const cmds = categories[cat] || [];

      const desc = cmds
        .map((name) => {
          const cmd = client.commands.get(name);
          const cleanDesc = (cmd?.data?.description || "No description available.")
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
          return `• **/${cmd?.data?.name || name}** — ${cleanDesc}`;
        })
        .join("\n") || "*No commands in this category.*";

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 }),
        })
        .setDescription(desc)
        .setColor("#3b82f6")
        .setFooter({
          text: "Select another category from the menu.",
        });

      await msg.edit({
        embeds: [embed],
        components: [row],
      });
    });

    // Disable after timeout
    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );

      await msg.edit({
        components: [disabled],
      }).catch(() => {});
    });
  },
};
