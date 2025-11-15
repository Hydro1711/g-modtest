import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main-node",
        host: "lava-v4.ajieblogs.eu.org",
        port: 80,
        password: "https://dsc.gg/ajidevserver",
        secure: false
      }
    ],

    plugins: [], // no Spotify plugin

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  client.on("raw", (d) => manager.updateVoiceState(d));
  return manager;
}
