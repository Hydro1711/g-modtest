import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Options,
} from "discord.js";

import mongoose from "mongoose";
import express from "express";
import fs from "fs";
import fetch from "node-fetch";

import { loadEvents } from "./Handlers/eventHandler.js";
import { loadCommands } from "./Handlers/commandHandler.js";
import { loadConfig } from "./Functions/configLoader.js";

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
    GuildMessages,
    MessageContent,
    GuildVoiceStates,
    GuildMessageReactions,
    GuildModeration,
    GatewayIntentBits.GuildPresences,
  ],
  makeCache: Options.cacheWithLimits({
    GuildMemberManager: 500,
    PresenceManager: 500,
  }),
  partials: [User, Message, GuildMember, ThreadMember, Channel, MessageReaction],
});

client.config = config;
client.commands = new Collection();
client.subCommands = new Collection();
client.events = new Collection();
client.guildConfig = new Collection();
client.prefixCommands = new Map();

// MongoDB
const mongoURL = process.env.MONGODB_URL;
if (!mongoURL) {
  console.error("❌ No MongoDB URL found!");
  process.exit(1);
}

mongoose
  .connect(mongoURL, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Config first
loadConfig(client);

// Events once (guard)
if (!client._eventsLoaded) {
  client._eventsLoaded = true;
  await loadEvents(client);
}

// READY
client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  await loadCommands(client);

  client.user.setActivity(`with ${client.guilds.cache.size} guild(s)`);
  console.log("✅ Bot is fully ready with full presence support!");
});

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No Discord token found!");
  process.exit(1);
}

client.login(token).catch((err) => console.error("❌ Login failed:", err));

// Web server (Render)
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

// Optional keepalive
setInterval(() => {
  fetch("https://g-modtest.onrender.com/").catch(() =>
    console.log("⚠️ Self-ping failed")
  );
}, 5 * 60 * 1000);

export default client;
