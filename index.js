import dotenv from "dotenv";
dotenv.config();

import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import mongoose from "mongoose";
import express from "express";
import fs from "fs";
import fetch from "node-fetch";

// LOAD CONFIG
const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

// ⭐ PREFIX
const PREFIX = "g!";

// INTENTS
const {
  Guilds,
  GuildMembers,
  GuildMessages,
  MessageContent,
  GuildVoiceStates,
  GuildMessageReactions,
  GuildModeration,
} = GatewayIntentBits;

const {
  User,
  Message,
  GuildMember,
  ThreadMember,
  Channel,
  MessageReaction,
} = Partials;

// CLIENT
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
  partials: [User, Message, GuildMember, ThreadMember, Channel, MessageReaction],
});

// Collections
client.config = config;
client.commands = new Collection();
client.subCommands = new Collection();
client.events = new Collection();
client.guildConfig = new Collection();
client.prefixCommands = new Collection(); // ⭐ PREFIX COMMANDS

// ---------------------------------------------------------
// ⭐ PREFIX HANDLER
// ---------------------------------------------------------
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
  const cmdName = args.shift().toLowerCase();

  const cmd = client.prefixCommands.get(cmdName);

  if (!cmd) return;

  try {
    await cmd.execute(client, message, args);
  } catch (err) {
    console.error("Prefix command error:", err);
    message.reply("❌ Command error.");
  }
});

// ---------------------------------------------------------
// MONGODB
// ---------------------------------------------------------
const mongoURL = process.env.MONGODB_URL;
if (!mongoURL) {
  console.error("❌ No MongoDB URL found!");
  process.exit(1);
}

mongoose
  .connect(mongoURL, {})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------------------------------------------------------
// LOAD HANDLERS
// ---------------------------------------------------------
import { loadEvents } from "./Handlers/eventHandler.js";
import { loadCommands } from "./Handlers/commandHandler.js";
import { loadConfig } from "./Functions/configLoader.js";
import { loadPrefixCommands } from "./Handlers/prefixHandler.js"; // ⭐ REQUIRED

// Load events + config
loadEvents(client);
loadConfig(client);

// ---------------------------------------------------------
// READY
// ---------------------------------------------------------
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Load slash commands
  await loadCommands(client);

  // ⭐ LOAD PREFIX COMMANDS
  await loadPrefixCommands(client);

  client.user.setActivity(`with ${client.guilds.cache.size} guild(s)`);
  console.log("✅ Bot is fully ready and intents/partials are set!");
});

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No Discord token found!");
  process.exit(1);
}

client.login(token).catch((err) => console.error("❌ Login failed:", err));

// ---------------------------------------------------------
// WEB SERVER (RENDER KEEPALIVE)
// ---------------------------------------------------------
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
