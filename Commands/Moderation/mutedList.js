const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ComponentType,
  Colors,
} = require("discord.js");
const MutedList = require("../../Schemas/mutedList");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mutedlist")
    .setDescription("View a paginated list of all currently muted users.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      // Safely defer to prevent “Unknown interaction” or “Already acknowledged”
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: false });
      }

      // Fetch muted users
      const mutedUsers = await MutedList.find({ guildId: interaction.guild.id });
      if (!mutedUsers || mutedUsers.length === 0) {
        return interaction.editReply("✅ No muted users found in this server.");
      }

      // Pagination setup
      const pageSize = 10;
      const totalPages = Math.ceil(mutedUsers.length / pageSize);
      const pages = [];

      for (let i = 0; i < mutedUsers.length; i += pageSize) {
        const chunk = mutedUsers.slice(i, i + pageSize);
        const description = chunk
          .map(
            (m, idx) =>
              `**${i + idx + 1}.** <@${m.userId}> — ${
                m.reason || "*No reason provided*"
              }\n> 🔧 Muted by: <@${m.moderatorId}>`
          )
          .join("\n\n");

        const embed = new EmbedBuilder()
          .setAuthor({
            name: `${interaction.client.user.username} • Muted Users`,
            iconURL: interaction.client.user.displayAvatarURL({ size: 256 }),
          })
          .setDescription(description)
          .setColor("#2b6cb0") // same theme as help command
          .setFooter({
            text: `Page ${Math.floor(i / pageSize) + 1} of ${totalPages}`,
          })
          .setTimestamp();

        pages.push(embed);
      }

      let currentPage = 0;

      const getButtons = (disableAll = false) =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disableAll || currentPage === 0),
          new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disableAll),
          new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disableAll || currentPage === pages.length - 1)
        );

      const msg = await interaction.editReply({
        embeds: [pages[currentPage]],
        components: [getButtons()],
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

        await msg.edit({
          embeds: [pages[currentPage]],
          components: [getButtons()],
        });
      });

      collector.on("end", async () => {
        await msg
          .edit({
            components: [getButtons(true)],
          })
          .catch(() => {});
      });
    } catch (err) {
      console.error("[/mutedlist] Command error:", err);

      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: "❌ An error occurred while fetching muted users.",
          ephemeral: true,
        });
      }

      await interaction.followUp({
        content: "❌ An error occurred while fetching muted users.",
        ephemeral: true,
      });
    }
  },
};
