const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} = require("discord.js");
const MutedList = require("../../Schemas/mutedList");

module.exports = {
  name: "mutedlist",
  description: "Shows a list of currently muted users",
  prefix: true, // prefix command

  async execute(message, args, client) {
    // Permission check: only members with Moderate Members permission
    if (!message.member.permissions.has("ModerateMembers")) {
      return message.channel.send(
        "❌ You need the **Moderate Members** permission to use this command."
      );
    }

    try {
      // Fetch muted users for this guild
      const mutedUsers = await MutedList.find({ guildId: message.guild.id });
      if (!mutedUsers || mutedUsers.length === 0) {
        return message.channel.send("✅ No muted users found.");
      }

      // Split into pages of 10 users each
      const pageSize = 10;
      const pages = [];

      for (let i = 0; i < mutedUsers.length; i += pageSize) {
        const chunk = mutedUsers.slice(i, i + pageSize);
        const desc = chunk
          .map(
            (m, idx) =>
              `**${i + idx + 1}.** <@${m.userId}> | **Reason:** ${
                m.reason || "No reason"
              }\n🔧 Muted by: <@${m.moderatorId}>`
          )
          .join("\n\n");

        const embed = new EmbedBuilder()
          .setTitle(`🔇 Muted Users (${message.guild.name})`)
          .setDescription(desc)
          .setColor(Colors.Orange)
          .setFooter({
            text: `Page ${Math.floor(i / pageSize) + 1}/${Math.ceil(
              mutedUsers.length / pageSize
            )}`,
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

      const msg = await message.channel.send({
        embeds: [pages[currentPage]],
        components: [row],
      });

      const filter = (i) => i.user.id === message.author.id;
      const collector = msg.createMessageComponentCollector({
        filter,
        time: 120000,
      });

      collector.on("collect", async (interaction) => {
        await interaction.deferUpdate();

        if (interaction.customId === "prev" && currentPage > 0) {
          currentPage--;
        } else if (
          interaction.customId === "next" &&
          currentPage < pages.length - 1
        ) {
          currentPage++;
        } else if (interaction.customId === "stop") {
          collector.stop();
          return;
        }

        const newRow = new ActionRowBuilder().addComponents(
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

        await msg.edit({ embeds: [pages[currentPage]], components: [newRow] });
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
      console.error("Error fetching muted users:", err);
      return message.channel.send("❌ Failed to fetch muted users.");
    }
  },
};
