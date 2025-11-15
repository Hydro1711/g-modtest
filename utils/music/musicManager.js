import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main",
        host: "lavalink-replit.pw",
        port: 443,
        password: "LAVA",
        secure: true
      }
    ],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  manager.on("nodeConnect", (node) => {
    console.log(`🟢 Lavalink connected: ${node.options.name}`);
  });

  manager.on("nodeError", (node, error) => {
    console.log(`❌ Lavalink error (${node.options.name}):`, error);
  });

  manager.on("nodeDisconnect", (node) => {
    console.log(`🔴 Lavalink disconnected: ${node.options.name}`);
  });

  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
