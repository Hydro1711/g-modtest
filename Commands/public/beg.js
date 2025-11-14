const { SlashCommandBuilder, EmbedBuilder, Colors } = require("discord.js");
const User = require("../../models/user");

const BEG_COOLDOWN = 45 * 1000; // 45 seconds

const FAIL_MESSAGES = [
  "Nobody cared enough to give you anything.",
  "They told you to get a job instead.",
  "You got ignored by everyone passing by.",
  "Someone laughed in your face and walked away.",
  "You held out your hand. It stayed empty.",
];

const SUCCESS_MESSAGES = [
  "A stranger felt bad and slipped you some chips.",
  "An old friend recognized you and helped out.",
  "A rich guy threw some chips your way.",
  "Someone dropped chips and you quietly picked them up.",
];

function formatVeryShort(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes && seconds) return `${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("beg")
    .setDescription("Beg for chips with a risky 50/50 chance (global)."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    try {
      let user = await User.findOne({ userId });
      if (!user) {
        user = await User.create({ userId, chips: 0 });
      }

      if (user.lastBeg) {
        const diff = now - user.lastBeg.getTime();
        if (diff < BEG_COOLDOWN) {
          const remaining = BEG_COOLDOWN - diff;
          return interaction.reply({
            content: `⏳ You begged recently. Try again in **${formatVeryShort(remaining)}**.`,
            ephemeral: true,
          });
        }
      }

      user.lastBeg = new Date(now);

      const success = Math.random() < 0.5;

      if (!success) {
        const msg = FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)];
        await user.save();

        const embed = new EmbedBuilder()
          .setColor(Colors.Red)
          .setTitle("🙅 Beg Failed")
          .setDescription(msg)
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      const reward = Math.floor(Math.random() * (200 - 40 + 1)) + 40; // 40–200
      user.chips = (user.chips || 0) + reward;

      const msg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
      await user.save();

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("🙏 Beg Successful")
        .setDescription(`${msg}\nYou received **${reward.toLocaleString()} chips**.`)
        .addFields({ name: "Total Chips", value: `${user.chips.toLocaleString()}`, inline: true })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /beg:", err);
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({ content: "❌ Error while processing beg." });
      }
      await interaction.reply({
        content: "❌ Error while processing beg.",
        ephemeral: true,
      });
    }
  },
};
