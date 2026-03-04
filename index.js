require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Options,
} = require("discord.js");

const mongoose = require("mongoose");
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");

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
client.prefixCommands = new Map();

// MongoDB
const mongoURL = process.env.MONGODB_URL;
if (!mongoURL) {
  console.error("❌ No MongoDB URL found!");
  process.exit(1);
}

mongoose
  .connect(mongoURL)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Load handlers
const { loadEvents } = require("./Handlers/eventHandler");
const { loadCommands } = require("./Handlers/commandHandler");
const { loadConfig } = require("./Functions/configLoader");

loadEvents(client);
loadConfig(client);

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

// Web server (Render keepalive)
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

setInterval(() => {
  fetch("https://g-modtest.onrender.com/").catch(() =>
    console.log("⚠️ Self-ping failed (maybe asleep)")
  );
}, 5 * 60 * 1000);

module.exports = client;
