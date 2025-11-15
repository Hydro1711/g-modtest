import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        identifier: "render-node",
        host: "lavalink-server.onrender.com/", // <-- replace this
        port: 443,                            // Render always uses 443 for HTTPS
        password: "supersecret",              // same as application.yml
        secure: true,                         // MUST be true on Render
      }
    ],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    },
  });

  // Logging
  manager
    .on("nodeConnect", (node) => {
      console.log(`🟢 Lavalink connected: ${node.options.identifier}`);
    })
    .on("nodeError", (node, error) => {
      console.error(`❌ Lavalink error (${node.options.identifier}):`, error);
    })
    .on("nodeDisconnect", (node, reason) => {
      console.warn(`🔴 Lavalink disconnected (${node.options.identifier}):`, reason || "");
    });

  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
