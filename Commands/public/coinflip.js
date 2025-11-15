const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");
// const isCasinoCommandAllowed = require("../../utils/isCasinoCommandAllowed");

const MIN_BET = 10;
const MAX_BET = 50000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin and bet chips on heads or tails.")
    .addStringOption(opt =>
      opt
        .setName("side")
        .setDescription("Choose heads or tails.")
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" },
        )
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName("bet")
        .setDescription("How many chips to bet.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const choice = interaction.options.getString("side");
    const bet = interaction.options.getInteger("bet");
    const userId = interaction.user.id;

    try {
      // const allowed = await isCasinoCommandAllowed(interaction);
      // if (!allowed) return;

      if (bet < MIN_BET) {
        return interaction.reply({ content: `Minimum bet is ${MIN_BET} chips.`, ephemeral: true });
      }
      if (bet > MAX_BET) {
        return interaction.reply({ content: `Maximum bet is ${MAX_BET} chips.`, ephemeral: true });
      }

      let user = await User.findOne({ userId });
      if (!user) user = await User.create({ userId, chips: 0 });

      if ((user.chips || 0) < bet) {
        return interaction.reply({ content: "You don't have enough chips for that bet.", ephemeral: true });
      }

      user.chips -= bet;
      await user.save();

      const flip = Math.random() < 0.5 ? "heads" : "tails";
      let resultText;
      let color = Colors.Red;

      if (flip === choice) {
        const win = bet * 2;
        user.chips += win;
        await user.save();
        resultText = `The coin landed on **${flip.toUpperCase()}**. You won **${win.toLocaleString()}** chips!`;
        color = Colors.Green;
      } else {
        resultText = `The coin landed on **${flip.toUpperCase()}**. You lost your bet of **${bet.toLocaleString()}** chips.`;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle("🪙 Coinflip")
        .setDescription(resultText)
        .addFields({ name: "Balance", value: `${user.chips.toLocaleString()} chips`, inline: true })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /coinflip:", err);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "❌ Error while running coinflip." }).catch(() => {});
      } else {
        await interaction.reply({ content: "❌ Error while running coinflip.", ephemeral: true }).catch(() => {});
      }
    }
  },
};
