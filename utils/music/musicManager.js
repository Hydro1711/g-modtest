import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main",
        host: "lavalink.oops.wtf",
        port: 443,
        password: "www.freelavalink.node",
        secure: true
      }
    ],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  // Log events so you can see connection status
  manager.on("nodeConnect", (node) => {
    console.log(`🟢 Lavalink connected: ${node.options.name}`);
  });

  manager.on("nodeError", (node, error) => {
    console.log(`❌ Lavalink error (${node.options.name}):`, error);
  });

  manager.on("nodeDisconnect", (node) => {
    console.log(`🔴 Lavalink disconnected: ${node.options.name}`);
  });

  // Voice state updates
  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
