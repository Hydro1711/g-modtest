const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  Colors,
  ComponentType,
} = require("discord.js");
const MutedList = require("../../Schemas/mutedList");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mutedlist")
    .setDescription("View a list of all currently muted users.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    try {
      // Fetch muted users for this guild
      const mutedUsers = await MutedList.find({ guildId: interaction.guild.id });
      if (!mutedUsers || mutedUsers.length === 0) {
        return interaction.editReply("✅ No muted users found in this server.");
      }

      // Split into pages of 10
      const pageSize = 10;
      const totalPages = Math.ceil(mutedUsers.length / pageSize);
      const pages = [];

      for (let i = 0; i < mutedUsers.length; i += pageSize) {
        const chunk = mutedUsers.slice(i, i + pageSize);
        const desc = chunk
          .map(
            (m, idx) =>
              `**${i + idx + 1}.** <@${m.userId}> — ${
                m.reason || "*No reason provided*"
              }\n> 🔧 Muted by: <@${m.moderatorId}>`
          )
          .join("\n\n");

        const embed = new EmbedBuilder()
          .setTitle(`🔇 Muted Users in ${interaction.guild.name}`)
          .setDescription(desc)
          .setColor(Colors.Orange)
          .setFooter({
            text: `Page ${Math.floor(i / pageSize) + 1} of ${totalPages}`,
          })
          .setTimestamp();

        pages.push(embed);
      }

      let currentPage = 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("stop")
          .setEmoji("⏹️")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pages.length === 1)
      );

      const msg = await interaction.editReply({
        embeds: [pages[currentPage]],
        components: [row],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();

        if (i.customId === "prev" && currentPage > 0) {
          currentPage--;
        } else if (i.customId === "next" && currentPage < pages.length - 1) {
          currentPage++;
        } else if (i.customId === "stop") {
          collector.stop();
          return;
        }

        const updatedRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === pages.length - 1)
        );

        await msg.edit({
          embeds: [pages[currentPage]],
          components: [updatedRow],
        });
      });

      collector.on("end", async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await msg.edit({ components: [disabledRow] }).catch(() => {});
      });
    } catch (err) {
      console.error("[/mutedlist] Error:", err);
      return interaction.editReply("❌ Failed to fetch muted users.");
    }
  },
};
