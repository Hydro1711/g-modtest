const { ChatInputCommandInteraction, Client } = require("discord.js");
const { loadCommands } = require("../../../Handlers/commandHandler");

module.exports = {
  subCommand: "reload.commands",
  /**
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  execute(interaction, client) {
    console.log(`[Reload Commands] User ${interaction.user.tag} requested reload`);
    loadCommands(client);
    console.log("[Reload Commands] Commands reloaded");
    interaction.reply({ content: "Reloaded Commands", ephemeral: true });
  },
};
