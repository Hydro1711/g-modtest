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

    plugins: [], // Spotify disabled as requested

    send(id, payload) {
      const guild = client.guilds.cache.get(id);
      if (guild) guild.shard.send(payload);
    }
  });

  // Required for voice state updates
  client.on("raw", (d) => manager.updateVoiceState(d));

  return manager;
}
