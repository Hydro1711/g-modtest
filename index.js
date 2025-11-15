import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import mongoose from "mongoose";
import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import { createMusicManager } from "./utils/music/musicManager.js";

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

const {
  Guilds,
  GuildMembers,
  GuildMessages,
  MessageContent,
  GuildVoiceStates,
  GuildMessageReactions,
  GuildModeration,
} = GatewayIntentBits;

const { User, Message, GuildMember, ThreadMember, Channel, MessageReaction } =
  Partials;

const client = new Client({
  intents: [
    Guilds,
    GuildMembers,
    GuildModeration,
    GuildMessages,
    MessageContent,
    GuildVoiceStates,
    GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    User,
    Message,
    GuildMember,
    ThreadMember,
    Channel,
    MessageReaction,
  ],
});

// Load client properties
client.config = config;
client.commands = new Collection();
client.subCommands = new Collection();
client.events = new Collection();
client.guildConfig = new Collection();

// Connect to MongoDB
const mongoURL = process.env.MONGODB_URL;
if (!mongoURL) {
  console.error("❌ No MongoDB URL found! Make sure MONGODB_URL is set.");
  process.exit(1);
}

mongoose
  .connect(mongoURL, {})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Load handlers
import { loadEvents } from "./Handlers/eventHandler.js";
import { loadCommands } from "./Handlers/commandHandler.js";
import { loadConfig } from "./Functions/configLoader.js";

loadEvents(client);
loadConfig(client);

// Increase max listeners to prevent warnings
client.setMaxListeners(20);

// When the bot is ready
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // 🎵 Initialize Lavalink
  client.manager = createMusicManager(client);
  client.manager.init(client.user.id);
  console.log("🎶 Lavalink Manager initialized!");

  await loadCommands(client);

  client.user.setActivity(`with ${client.guilds.cache.size} guild(s)`);
  console.log("✅ Bot is fully ready and intents/partials are set!");
});

// Secure login using environment variable
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No Discord token found! Make sure DISCORD_TOKEN is set.");
  process.exit(1);
}

client.login(token).catch((err) => console.error("❌ Login failed:", err));

// Render keep-alive web server
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));

// Use dynamic port for Render compatibility
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// Optional: self-ping every 5 minutes to prevent sleep
setInterval(() => {
  fetch("https://g-modtest.onrender.com/").catch(() =>
    console.log("⚠️ Self-ping failed (maybe asleep)")
  );
}, 5 * 60 * 1000); // every 5 minutes

// Export client
export default client;
