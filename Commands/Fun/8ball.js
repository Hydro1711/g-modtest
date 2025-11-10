const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8ball a question.")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("What do you want to ask?")
        .setRequired(true)
    ),
  async execute(interaction) {
    const responses = [
      "Yes.",
      "No.",
      "Maybe.",
      "Definitely!",
      "Absolutely not.",
      "Ask again later.",
      "It’s uncertain.",
      "Without a doubt.",
      "Don’t count on it.",
      "Signs point to yes."
    ];

    const question = interaction.options.getString("question");
    const answer = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setTitle("🎱 The Magic 8-Ball")
      .addFields(
        { name: "Question", value: question },
        { name: "Answer", value: answer }
      )
      .setColor("Blue");

    await interaction.reply({ embeds: [embed] });
  },
};
