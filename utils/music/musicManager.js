import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main-node",
        host: "lava-v4.ajieblogs.eu.org",
        port: 443,
        password: "https://dsc.gg/ajidevserver",
        secure: true
      }
    ],

    plugins: [],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  client.on("raw", (d) => manager.updateVoiceState(d));

  manager.on("nodeConnect", node => {
    console.log(`🟢 Lavalink connected: ${node.options.name}`);
  });

  manager.on("nodeError", (node, err) => {
    console.log(`❌ Lavalink error (${node.options.name}):`, err);
  });

  manager.on("nodeDisconnect", node => {
    console.log(`🔴 Lavalink disconnected: ${node.options.name}`);
  });

  return manager;
}
