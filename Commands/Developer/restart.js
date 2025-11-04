// Commands/Developer/restart.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("🔄 Restart the bot (Developer only)"),

  async execute(interaction) {
    if (interaction.user.id !== config.DeveloperID) {
      return interaction.reply({ 
        content: "❌ You don’t have permission to use this command.", 
        ephemeral: true 
      });
    }

    await interaction.reply("♻️ Restarting bot...");

    console.log(`[Developer] Bot restart requested by ${interaction.user.tag} (${interaction.user.id})`);

    setTimeout(() => {
      process.exit(0);
    }, 2000);
  },
};
