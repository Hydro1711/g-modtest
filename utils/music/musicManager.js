// utils/music/musicManager.js
import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        identifier: "jirayu",
        host: "lavalink.jirayu.net",
        port: 13592,
        password: "youshallnotpass",
        secure: false,
      },
      {
        identifier: "ajieblogs",
        host: "lava-v4.ajieblogs.eu.org",
        port: 80,
        password: "https://dsc.gg/ajidevserver",
        secure: false,
      },
      {
        identifier: "trinium",
        host: "140.238.179.182",
        port: 2333,
        password: "kirito",
        secure: false,
      },
    ],

    // this sends voice payloads from erela → Discord
    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    },
  });

  // basic logging so you can see what's going on
  manager
    .on("nodeConnect", (node) => {
      console.log(`🟢 Lavalink connected: ${node.options.identifier || node.options.host}`);
    })
    .on("nodeError", (node, error) => {
      console.error(`❌ Lavalink error (${node.options.identifier || node.options.host}):`, error);
    })
    .on("nodeDisconnect", (node, reason) => {
      console.warn(`🔴 Lavalink disconnected: ${node.options.identifier || node.options.host}`, reason || "");
    });

  // required for erela.js to track voice state
  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
