const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user"); 
const GlobalLevel = require("../../Schemas/GlobalLevel.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Check your (or another user's) global money and chips.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("Check someone else's wallet")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    const userId = target.id;

    try {
      // ===============================
      // GLOBAL MONEY
      // ===============================
      let levelData = await GlobalLevel.findOne({ userId });
      if (!levelData) {
        levelData = await GlobalLevel.create({
          userId,
          balance: 0
        });
      }

      // ===============================
      // GLOBAL CHIPS
      // ===============================
      let chipData = await User.findOne({ userId });
      if (!chipData) {
        chipData = await User.create({
          userId,
          chips: 0
        });
      }

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

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Error fetching wallet:", err);
      await interaction.reply({
        content: "❌ There was an error fetching the wallet.",
        ephemeral: true
      });
    }
  },
};
