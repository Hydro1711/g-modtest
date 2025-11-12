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

    // --- Command categories ---
    const categories = {
      Developer: [
        "createlink",
        "leaveServer",
        "restart",
        "serverList",
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
        "kiss",
        "smoke",
      ],

      Public: [
        "ping",
        "userinfo",
        "serverinfo",
        "avatar",
        "botinfo",
        "invite",
        "afk",
        "balance",
        "crypto",
        "spotify",
        "tts",
      ],
    };

    // Dropdown options
    const options = Object.keys(categories).map((cat) => ({
      label: cat,
      description: `View ${cat} commands.`,
      value: cat,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("help-menu")
      .setPlaceholder("📂 Select a category to view commands")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    // --- Refined homepage embed ---
    const introEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user.username} Help Center`,
        iconURL: client.user.displayAvatarURL({ size: 256 }),
      })
      .setDescription(
        [
          "### 👋 Welcome to the Help Menu!",
          "Easily browse through all available commands, neatly organized by category.",
          "",
          "📁 **Categories:**",
          "• Developer — Owner-only utilities & control tools.",
          "• Moderation — Manage your server & users.",
          "• Fun — Roleplay, memes, and entertainment.",
          "• Public — General info, utilities, and tools.",
          "",
          "Use the **dropdown below** to select a category.",
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

    // Send main embed
    const msg = await interaction.reply({
      embeds: [introEmbed],
      components: [row],
      ephemeral: false,
    });

    // --- Dropdown collector ---
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "❌ You cannot use this menu.",
          ephemeral: true,
        });
      }

      const cat = i.values[0];
      const cmds = categories[cat] || [];

      const desc = cmds
        .map((name) => {
          const cmd = client.commands.get(name);
          return `• **/${cmd?.data?.name || name}** — ${cmd?.data?.description || "No description available."}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${cat} Commands`,
          iconURL: client.user.displayAvatarURL({ size: 256 }),
        })
        .setDescription(desc || "No commands found in this category.")
        .setColor("#3b82f6")
        .setFooter({
          text: "Select another category to view more commands.",
        });

      await i.update({ embeds: [embed], components: [row] });
    });

    // --- Disable menu after 2 minutes ---
    collector.on("end", async () => {
      const disabled = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(menu).setDisabled(true)
      );
      await msg.edit({ components: [disabled] }).catch(() => {});
    });
  },
};
