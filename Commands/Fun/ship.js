const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship two users together 💕")
    .addUserOption(option =>
      option.setName("user1").setDescription("First user").setRequired(true)
    )
    .addUserOption(option =>
      option.setName("user2").setDescription("Second user").setRequired(true)
    ),
  async execute(interaction) {
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2");

    const percent = Math.floor(Math.random() * 101);
    const hearts = "❤️".repeat(Math.floor(percent / 20)) + "🖤".repeat(5 - Math.floor(percent / 20));

    const embed = new EmbedBuilder()
      .setTitle("💘 Love Calculator")
      .setDescription(`${user1} ❤️ ${user2}\n\n**Compatibility:** ${percent}%\n${hearts}`)
      .setColor(percent > 70 ? "Green" : percent > 40 ? "Yellow" : "Red");

    await interaction.reply({ embeds: [embed] });
  },
};
