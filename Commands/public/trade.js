const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  userMention
} = require("discord.js");
const User = require("../../models/user");
const getOrCreateUser = require('../../Functions/getOrCreateUser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Send a secure chip trade request to another user.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User you want to trade with.")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("chips")
        .setDescription("Chips you will offer.")
        .setRequired(true)
        .setMinValue(1)
    )
    .setDMPermission(false),

  category: "Economy",

  async execute(interaction) {
    const fromId = interaction.user.id;
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("chips", true);

    if (target.id === fromId) {
      return interaction.reply({ content: "❌ You cannot trade with yourself.", ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: "❌ You cannot trade with bots.", ephemeral: true });
    }

    let fromUser = await User.findOne({ userId: fromId });
    if (!fromUser || fromUser.chips < amount) {
      return interaction.reply({ content: "❌ You don't have enough chips.", ephemeral: true });
    }

    let toUser = await User.findOne({ userId: target.id });
    if (!toUser) {
      toUser = await User.create({ userId: target.id, chips: 0 });
    }

    const embed = new EmbedBuilder()
      .setTitle("🤝 Trade Request")
      .setDescription(
        `${userMention(fromId)} wants to trade **${amount.toLocaleString()} chips** with ${userMention(target.id)}.\n\n` +
        `${userMention(target.id)}, do you accept this trade?`
      )
      .setColor(0x3b82f6);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("trade_accept")
        .setLabel("✅ Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("trade_decline")
        .setLabel("❌ Decline")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({
      content: userMention(target.id),
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000
    });

    let completed = false;

    collector.on("collect", async (btn) => {
      if (btn.user.id !== target.id) {
        return btn.reply({ content: "❌ Only the trade target can respond.", ephemeral: true });
      }

      if (btn.customId === "trade_decline") {
        completed = true;
        const declined = EmbedBuilder.from(embed)
          .setColor(0xef4444)
          .setDescription(
            `${userMention(target.id)} **declined** the trade from ${userMention(fromId)}.`
          );
        return btn.update({ embeds: [declined], components: [] });
      }

      // Accept ==================================================
      await fromUser.reload();
      if (fromUser.chips < amount) {
        completed = true;
        const fail = EmbedBuilder.from(embed)
          .setColor(0xef4444)
          .setDescription(
            `❌ Trade failed because ${userMention(fromId)} no longer has enough chips.`
          );
        return btn.update({ embeds: [fail], components: [] });
      }

      fromUser.chips -= amount;
      toUser.chips += amount;
      await Promise.all([fromUser.save(), toUser.save()]);

      completed = true;

      const success = EmbedBuilder.from(embed)
        .setColor(0x22c55e)
        .setDescription(
          `✅ Trade completed!\n\n` +
          `${userMention(fromId)} ➜ ${userMention(target.id)}\n` +
          `Amount: \`${amount.toLocaleString()} chips\``
        );

      return btn.update({ embeds: [success], components: [] });
    });

    collector.on("end", async () => {
      if (!completed) {
        const expired = EmbedBuilder.from(embed)
          .setColor(0x9ca3af)
          .setDescription("⌛ Trade request expired (no response).");
        await msg.edit({ embeds: [expired], components: [] }).catch(() => {});
      }
    });
  }
};
