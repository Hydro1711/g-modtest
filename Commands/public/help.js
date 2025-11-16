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
    //  COMMAND CATEGORIES — WITH NEW ECONOMY COMMANDS ADDED
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
        "loaditems" // NEW
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
        "shop",          // NEW
        "buy",           // NEW
        "inventory",     // NEW
        "cases",         // OPTIONAL
        "plinko",        // OPTIONAL
        "tower",         // OPTIONAL
        "dice",          // OPTIONAL
        "crash",         // OPTIONAL
        "trade"          // OPTIONAL
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
          "",
          "🛠 **Developer** — Bot owner tools",
          "🛡 **Moderation** — Moderation & server control",
          "🎉 **Fun** — Games & entertainment",
          "🎰 **Economy** — Casino, chips, items, shop",
          "🌐 **Public** — General utilities",
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

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
    });

    // ==========================================================
    // CATEGORY HANDLER
    // ==========================================================

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "❌ Not your menu.", ephemeral: true });
      }

      const cat = i.values[0];

      // Developer profile
      if (cat === "Developer") {
        const devUser = await client.users.fetch(developerId).catch(() => null);

        const devEmbed = new EmbedBuilder()
          .setTitle("👑 Bot Developer")
          .setThumbnail(devUser?.displayAvatarURL({ size: 512 }) || client.user.avatarURL())
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

      if (cat === "Home") {
        return i.update({ embeds: [homeEmbed], components: [row] });
      }

      // ===============================================
      // Format commands: readable, spaced, descriptive
      // ===============================================

      const cmds = categories[cat];

      const desc = cmds
        .map((cmdName) => {
          const cmd = client.commands.get(cmdName);
          const displayDesc =
            cmd?.data?.description
              ?.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
              ?? "No description available.";

          return `### • /${cmdName}\n${displayDesc}\n`;
        })
        .join("\n") || "*No commands in this category.*";

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 }),
        })
        .setDescription(desc)
        .setColor("#3b82f6");

      await i.update({ embeds: [embed] });
    });

    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );
      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  },
};
