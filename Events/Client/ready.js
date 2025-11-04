const { connect } = require("mongoose");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`\x1b[32m✅ The client is now ready. Logged in as ${client.user.tag}\x1b[0m`);

    // --- Invite cache setup ---
    client.invites = new Map();

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const invites = await guild.invites.fetch();
        client.invites.set(guildId, new Map(invites.map(inv => [inv.code, inv.uses])));
      } catch (err) {
        console.warn(
          `\x1b[33m[READY] Could not fetch invites for guild ${guild.name} (${guildId}): ${err.message}\x1b[0m`
        );
      }
    }

    console.log("\x1b[34m📩 Invite cache is ready for all guilds.\x1b[0m");

    // --- Server count logging setup ---
    const serverFile = path.join(__dirname, "../serverCount.json"); // adjust path if needed

    // Ensure file exists
    if (!fs.existsSync(serverFile)) fs.writeFileSync(serverFile, "[]");

    // Function to log server count
    const logServerCount = () => {
      const data = JSON.parse(fs.readFileSync(serverFile, "utf8"));
      data.push({ timestamp: Date.now(), guilds: client.guilds.cache.size });
      fs.writeFileSync(serverFile, JSON.stringify(data, null, 2));
      console.log(`\x1b[36m📊 Logged server count: ${client.guilds.cache.size}\x1b[0m`);
    };

    // Log immediately on bot ready
    logServerCount();

    // Log every hour
    setInterval(logServerCount, 3600000); // 3600000 ms = 1 hour
  },
};
