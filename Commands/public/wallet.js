const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");
const GlobalLevel = require("../../Schemas/GlobalLevel.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Check your (or another user's) global money and chips.")
    .addUserOption(opt =>
      opt
        .setName("user")
        .setDescription("Check someone else's wallet")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    const userId = target.id;

    try {

      // GLOBAL MONEY
      const levelData = await GlobalLevel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { balance: 0 } },
        { new: true, upsert: true }
      );

      // GLOBAL CHIPS (FIXED)
      const chipData = await User.findOneAndUpdate(
        { userId },
        { $setOnInsert: { chips: 0 } },
        { new: true, upsert: true }
      );

      // EMBED
      const embed = new EmbedBuilder()
        .setColor(Colors.Purple)
        .setTitle(`💼 ${target.username}'s Wallet`)
        .addFields(
          {
            name: "💰 Money",
            value: `$${Number(levelData.balance).toFixed(2)}`,
            inline: true
          },
          {
            name: "🎲 Chips",
            value: `${chipData.chips}`,
            inline: true
          }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Wallet error:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ There was an error fetching the wallet.",
          ephemeral: true,
        });
      }
    }
  },
};
