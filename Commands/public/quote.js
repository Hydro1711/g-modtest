const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Create a quote (use Apps → Quote Message)."),

  async execute(interaction) {
    return interaction.reply({
      content:
        "Use **Apps → Quote Message** on the message you want to quote.\n(Slash commands cannot read replied messages.)",
      ephemeral: true,
    });
  },
};
