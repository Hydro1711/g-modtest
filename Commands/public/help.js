const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  userMention
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse all bot commands by category."),

  async execute(interaction) {
    const client = interaction.client;

    const developerId = "582502664252686356";

    // ==========================================================
    // COMMAND CATEGORIES (UPDATED + NEW COMMANDS)
    // ==========================================================

    const categories = {
      Home: [],

      Developer: [
        "createlink",
        "leaveserver",
        "restart",
        "server-list",
        "reload",
        "reset_levels",
        "resetallchips",
        "takechips",
        "loaditems"
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
        "weekly",
        "work",
        "beg",
        "heist",
        "leaderboard",
        "blackjack",
        "coinflip",
        "crypto",

        // NEW ECONOMY SYSTEM
        "shop",
        "buy",
        "inventory",
        "cases",
        "plinko",
        "tower",
        "dice",
        "crash",
        "trade"
      ],

      Public: [
        "ping",
        "userinfo",
        "serverinfo",
        "avatar",
        "botinfo",
        "invite",
        "afk",
        "spotify",
        "tts",
        "help"
      ]
    };

    // MENU OPTIONS
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

    // ==========================================================
    // HOME PAGE
    // ==========================================================

    const homeEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user.username} Help Center`,
        iconURL: client.user.displayAvatarURL({ size: 256 }),
      })
      .setDescription(
        [
          "### 👋 Welcome to the Help Menu!",
          "Browse all commands using the categories below.",
          "",
          "📁 **Categories**",
          "🛠 Developer — Bot owner tools",
          "🛡 Moderation — Server management",
          "🎉 Fun — Entertainment",
          "🎰 Economy — Casino & chips",
          "🌍 Public — Utilities & info",
          "",
          `> 👑 Developer: ${userMention(developerId)}`
        ].join("\n")
      )
      .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
      .setColor("#3b82f6")
      .setFooter({ text: "Use /help anytime to reopen this menu." })
      .setTimestamp();

    const msg = await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
    });

    // ==========================================================
    // SELECT MENU HANDLER
    // ==========================================================

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "❌ You cannot use someone else's help menu.",
          ephemeral: true
        });
      }

      const cat = i.values[0];

      // Developer profile
      if (cat === "Developer") {
        const devUser = await client.users.fetch(developerId).catch(() => null);

        const devEmbed = new EmbedBuilder()
          .setTitle("👑 Bot Developer")
          .setThumbnail(
            devUser?.displayAvatarURL({ size: 512 }) ||
              client.user.displayAvatarURL({ size: 512 })
          )
          .setColor("#f5c542")
          .addFields(
            {
              name: "👤 Developer",
              value: devUser
                ? `${devUser.tag} (${userMention(developerId)})`
                : `User ID: ${developerId}`,
            },
            {
              name: "🛠 Developer Commands",
              value: categories.Developer
                .map((cmd) => `• **/${cmd}**`)
                .join("\n"),
            }
          )
          .setFooter({ text: "Bot Developer Profile" });

        return i.update({ embeds: [devEmbed], components: [row] });
      }

      // Return to home
      if (cat === "Home") {
        return i.update({ embeds: [homeEmbed], components: [row] });
      }

      // ======================================================
      // CATEGORY COMMAND LIST — CLEAN + COMPACT FORMAT
      // ======================================================

      const cmds = categories[cat];

      const desc = cmds
        .map((cmdName) => {
          const cmd = client.commands.get(cmdName);
          const cleanDesc = cmd?.data?.description
            ?.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
            ?? "No description available.";

          return `• **/${cmdName}** — ${cleanDesc}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 }),
        })
        .setDescription(desc)
        .setColor("#3b82f6");

      return i.update({ embeds: [embed], components: [row] });
    });

    // Disable menu on timeout
    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );

      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  }
};
