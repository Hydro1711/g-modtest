import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main",
        host: "lava-v4.ajieblogs.eu.org",
        port: 443,
        password: "ajidevserver",
        secure: true
      }
    ],

    plugins: [],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  // Lavalink connection logs
  manager.on("nodeConnect", node => {
    console.log(`✔ Connected to Lavalink: ${node.options.name}`);
  });

  manager.on("nodeError", (node, err) => {
    console.log(`❌ Node error: ${node.options.name}`, err);
  });

  // Required for VC
  client.on("raw", d => manager.updateVoiceState(d));

  return manager;
}
