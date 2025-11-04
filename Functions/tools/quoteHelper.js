// quoteHelper.js
const quoteSettings = new Map(); // guildId => enabled (true/false)

module.exports = {
  isEnabled(guildId) {
    // Default is enabled
    if (!quoteSettings.has(guildId)) return true;
    return quoteSettings.get(guildId);
  },
  toggle(guildId) {
    const current = quoteSettings.get(guildId) ?? true;
    quoteSettings.set(guildId, !current);
    return !current;
  },
};
