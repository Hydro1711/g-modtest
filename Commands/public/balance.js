const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const GlobalLevel = require("../../Schemas/GlobalLevel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your global money balance (or another user's).")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("The user whose balance you want to check")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser("user") || interaction.user;

    // Fetch balance from database
    let userData = await GlobalLevel.findOne({ userId: targetUser.id });

    if (!userData) {
      userData = new GlobalLevel({
        userId: targetUser.id,
        balance: 0
      });
      await userData.save();
    }

    const embed = new EmbedBuilder()
      .setColor("#00FF9C")
      .setTitle("💰 Global Balance")
      .setDescription(`${targetUser} currently has **$${userData.balance.toFixed(2)}**!`)
      .setFooter({ text: "Earn money by leveling up!" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
