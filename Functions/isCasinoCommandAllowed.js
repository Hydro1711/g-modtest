const CasinoConfig = require('../models/CasinoConfig');

async function isCasinoCommandAllowed(interaction) {
  const config = await CasinoConfig.findOne({ guildId: interaction.guild.id });

  console.log("Config:", config);
  console.log("Guild ID:", interaction.guild.id);
  console.log("Channel ID:", interaction.channel.id);

  if (!config || !config.enabled) return false;
  if (config.casinoChannelId !== interaction.channel.id) return false;

  return true;
}

module.exports = isCasinoCommandAllowed;
