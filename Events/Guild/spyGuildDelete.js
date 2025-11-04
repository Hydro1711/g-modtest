const Spy = require('../../Schemas/spy');

module.exports = {
  name: 'guildDelete',
  async execute(guild) {
    try {
      await Spy.deleteOne({ guildId: guild.id });
      console.log(`[SPY] Bot removed from server ${guild.name} (${guild.id}). Removed from spy list.`);
    } catch (err) {
      console.error('[SPY] Failed to remove server from spy DB:', err);
    }
  },
};
