const { ChatInputCommandInteraction, Client } = require("discord.js");
const { loadEvents } = require("../../../Handlers/eventHandler");

module.exports = {
  subCommand: "reload.events",
  /**
   * 
   * @param {ChatInputCommandInteraction} interaction
   * @param {Client} client
   */
  execute(interaction, client) {
    console.log(`[Reload Events] User ${interaction.user.tag} requested reload`);

    for (const [key, value] of client.events) {
      client.removeListener(`${key}`, value, true);
      console.log(`[Reload Events] Removed listener for event: ${key}`);
    }
    loadEvents(client);
    console.log("[Reload Events] Events reloaded");
    interaction.reply({ content: "Reloaded Events", ephemeral: true });
  },
};
