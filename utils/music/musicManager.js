import { Manager } from "erela.js";

export function createMusicManager(client) {
  const manager = new Manager({
    nodes: [
      {
        name: "main",
        host: "lava-v4.ajieblogs.eu.org",
        port: 443,
        password: "ajidevserver", // CORRECT PASSWORD
        secure: true              // v4 REQUIRES THIS
      }
    ],

    plugins: [], // Spotify disabled

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  // REQUIRED FOR VOICE SUPPORT
  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
