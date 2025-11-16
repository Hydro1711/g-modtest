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
    .setDescription("View all bot commands."),

  async execute(interaction) {
    const client = interaction.client;

    const developerId = "582502664252686356";

    // Command categories (restored normal layout)
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

        // new
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

    const categoryOptions = Object.keys(categories).map((cat) => ({
      label: cat,
      description: `View ${cat} commands`,
      value: cat
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("Select a category")
      .addOptions(categoryOptions);

    const row = new ActionRowBuilder().addComponents(menu);

    // Home embed (same minimal style)
    const homeEmbed = new EmbedBuilder()
      .setTitle(`${client.user.username} Help Menu`)
      .setDescription(
        `Browse commands using the dropdown below.\n\n` +
        `**Developer:** ${userMention(developerId)}`
      )
      .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
      .setColor("#3b82f6");

    const msg = await interaction.reply({
      embeds: [homeEmbed],
      components: [row]
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "This is not your menu.",
          ephemeral: true
        });
      }

      const cat = i.values[0];

      if (cat === "Home") {
        return i.update({ embeds: [homeEmbed], components: [row] });
      }

      // Developer profile page
      if (cat === "Developer") {
        const devUser = await client.users.fetch(developerId).catch(() => null);

        const devEmbed = new EmbedBuilder()
          .setTitle("Bot Developer")
          .setThumbnail(devUser?.displayAvatarURL({ size: 512 }) || client.user.displayAvatarURL())
          .setColor("#f5c542")
          .addFields(
            {
              name: "Developer",
              value: devUser ? `${devUser.tag}` : developerId
            },
            {
              name: "Commands",
              value: categories.Developer.map((cmd) => `• /${cmd}`).join("\n")
            }
          );

        return i.update({ embeds: [devEmbed], components: [row] });
      }

      const cmds = categories[cat];

      const description = cmds
        .map((cmdName) => {
          const cmd = client.commands.get(cmdName);
          return `/${cmdName} — ${cmd?.data?.description || "No description available."}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`${cat} Commands`)
        .setDescription(description)
        .setColor("#3b82f6");

      return i.update({ embeds: [embed], components: [row] });
    });

    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );
      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  }
};
