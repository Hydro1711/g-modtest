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

console.log("BOOT:", new Date().toISOString());
console.log("Node:", process.version);

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

// HARD LOGGING (so nothing is “silent”)
process.on("unhandledRejection", (r) => console.error("unhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e));

client.on("error", (e) => console.error("client error:", e));
client.on("warn", (w) => console.warn("client warn:", w));
client.on("shardError", (e) => console.error("shardError:", e));
client.on("invalidated", () => console.error("❌ Client invalidated"));

// Collections
client.config = config;
client.commands = new Collection();
client.subCommands = new Collection();
client.events = new Collection();
client.guildConfig = new Collection();
client.prefixCommands = new Map();

// ENV CHECKS (this is usually the real issue on Render)
console.log("ENV DISCORD_TOKEN present?", !!process.env.DISCORD_TOKEN);
console.log("ENV MONGODB_URL present?", !!process.env.MONGODB_URL);
console.log("ENV PORT:", process.env.PORT);

// MongoDB (don’t let it block the bot coming online)
(async () => {
  const mongoURL = process.env.MONGODB_URL;
  if (!mongoURL) {
    console.log("⚠️ No MongoDB URL found (skipping DB connect)");
    return;
  }

  try {
    await mongoose.connect(mongoURL, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
  }
})();

// Load handlers (wrap in try so you SEE failures)
let loadEvents, loadCommands, loadConfig;

try {
  ({ loadEvents } = require("./Handlers/eventHandler"));
  console.log("✅ eventHandler loaded");
} catch (e) {
  console.error("❌ Failed to require eventHandler:", e);
}

try {
  ({ loadCommands } = require("./Handlers/commandHandler"));
  console.log("✅ commandHandler loaded");
} catch (e) {
  console.error("❌ Failed to require commandHandler:", e);
}

try {
  ({ loadConfig } = require("./Functions/configLoader"));
  console.log("✅ configLoader loaded");
} catch (e) {
  console.error("❌ Failed to require configLoader:", e);
}

try {
  if (typeof loadEvents === "function") loadEvents(client);
  if (typeof loadConfig === "function") loadConfig(client);
} catch (e) {
  console.error("❌ Handler init error:", e);
}

// READY
client.once("ready", async () => {
  console.log(`✅ READY as ${client.user.tag}`);
  console.log("Guilds:", client.guilds.cache.size);

  try {
    if (typeof loadCommands === "function") {
      console.log("Loading commands...");
      await loadCommands(client);
      console.log("✅ Commands loaded");
    } else {
      console.log("⚠️ loadCommands is not a function");
    }
  } catch (e) {
    console.error("❌ loadCommands crashed:", e);
  }

  try {
    client.user.setActivity(`with ${client.guilds.cache.size} guild(s)`);
  } catch (e) {
    console.error("❌ setActivity failed:", e);
  }
});

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ No Discord token found! (Render Environment Vars)");
  process.exit(1);
}

client
  .login(token)
  .then(() => console.log("✅ login() resolved"))
  .catch((err) => console.error("❌ Login failed:", err));

// Web server (Render)
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

setInterval(() => {
  fetch("https://g-modtest.onrender.com/").catch(() =>
    console.log("⚠️ Self-ping failed")
  );
}, 5 * 60 * 1000);

module.exports = client;
