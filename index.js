import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import mongoose from "mongoose";
import express from "express";
import fs from "fs";
import fetch from "node-fetch";

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

// Collections
client.config = config;
client.commands = new Collection();
client.subCommands = new Collection();
client.events = new Collection();
client.guildConfig = new Collection();

// ⭐ NEW (matches other system)
client.prefixCommands = new Map();

// MongoDB
const mongoURL = process.env.MONGODB_URL;
if (!mongoURL) {
  console.error("❌ No MongoDB URL found!");
  process.exit(1);
}

mongoose
  .connect(mongoURL, {})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// --------------------
// Load Handlers
// --------------------
import { loadEvents } from "./Handlers/eventHandler.js";
import { loadCommands } from "./Handlers/commandHandler.js"; // loads slash + prefix
import { loadConfig } from "./Functions/configLoader.js";

loadEvents(client);
loadConfig(client);

client.setMaxListeners(20);

// --------------------
// ⭐ READY
// --------------------
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  await loadCommands(client);       // this loads prefix + slash (from his handler)

  client.user.setActivity(`with ${client.guilds.cache.size} guild(s)`);
  console.log("✅ Bot is fully ready and intents/partials are set!");
});

// --------------------
// Login
// --------------------
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No Discord token found!");
  process.exit(1);
}

client.login(token).catch((err) => console.error("❌ Login failed:", err));

// --------------------
// Keep-alive
// --------------------
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

setInterval(() => {
  fetch("https://g-modtest.onrender.com/").catch(() =>
    console.log("⚠️ Self-ping failed (maybe asleep)")
  );
}, 5 * 60 * 1000);

export default client;
