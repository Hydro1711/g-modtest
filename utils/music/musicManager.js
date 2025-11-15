import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main",
        host: "lavalink.party",
        port: 443,
        password: "LAVA",
        secure: true
      }
    ],

    plugins: [],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  // Lavalink required events
  manager.on("nodeConnect", (node) =>
    console.log(`🟢 Lavalink connected: ${node.options.name}`)
  );

  manager.on("nodeError", (node, error) =>
    console.log(`❌ Lavalink error (${node.options.name}):`, error)
  );

  manager.on("nodeDisconnect", (node) =>
    console.log(`🔴 Lavalink disconnected: ${node.options.name}`)
  );

  // Required for voice state tracking
  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
