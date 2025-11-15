import { Manager } from "erela.js";
import Spotify from "erela.js-spotify";

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

    plugins: [
      new Spotify({
        clientID: process.env.SPOTIFY_ID,
        clientSecret: process.env.SPOTIFY_SECRET
      })
    ],

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  // Required for voice state updates
  client.on("raw", (d) => manager.updateVoiceState(d));

  client.manager = manager;
  return manager;
}
