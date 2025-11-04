// Load environment variables from .env
import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import mongoose from "mongoose";
import express from "express";
import fs from "fs"; // 👈 Added for config.json loading
import fetch from "node-fetch"; // 👈 For optional self-ping

// Load config.json manually (works in Node 22+)
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

// Define intents and partials
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

// Create the client
const client = new Client({
  intents: [
    Guilds,
    GuildMembers,
    GuildModeration,
    GuildMessages,
    MessageContent,
    GuildVoiceStates,
    GuildMessageReactions,
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

// ✅ Increase max listeners to prevent warnings on multiple events
client.setMaxListeners(20);

// When the bot is ready
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await loadCommands(client);
  client.user.setActivity(`with ${client.guilds.cache.size} guild(s)`);
  console.log("✅ Bot is fully ready and intents/partials are set!");
});

// ✅ Secure login using environment variable
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No Discord token found! Make sure DISCORD_TOKEN is set.");
  process.exit(1);
}

client.login(token).catch((err) => console.error("❌ Login failed:", err));

// ✅ Render keep-alive web server
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));

// ⚙️ Use dynamic port for Render compatibility
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// 🏓 Optional: Self-ping every 5 minutes to prevent sleep
setInterval(() => {
  fetch("https://g-modtest.onrender.com/").catch(() =>
    console.log("⚠️ Self-ping failed (maybe asleep)")
  );
}, 5 * 60 * 1000); // every 5 minutes

// Export client (optional)
export default client;
