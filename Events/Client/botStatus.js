const STATUS_CHANNEL_ID = "1434655729075093676";

let statusMessageId = null;

async function updateStatusChannel(client, statusText, dot) {
  try {
    const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
    if (!channel) return;

    const newName = `${dot} ${statusText}`;
    if (channel.name !== newName) {
      await channel.setName(newName);
    }
  } catch (err) {
    console.error("Failed to update status channel:", err);
  }
}

async function updateStatusEmbed(client, title, description, color) {
  try {
    const channel = await client.channels.fetch(STATUS_CHANNEL_ID);
    if (!channel?.isTextBased()) return;

    const embed = {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
    };

    if (statusMessageId) {
      try {
        const msg = await channel.messages.fetch(statusMessageId);
        await msg.edit({ embeds: [embed] });
      } catch {
        statusMessageId = null;
      }
    }

    if (!statusMessageId) {
      const msg = await channel.send({ embeds: [embed] });
      statusMessageId = msg.id;
    }
  } catch (err) {
    console.error("Failed to post/update status embed:", err);
  }
}

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    // Startup / loading status
    await updateStatusChannel(client, "Bot Starting", "🟠");
    await updateStatusEmbed(client, "Bot Status", "Starting up...", 0xffa500);

    // Simulate delay for full startup
    setTimeout(async () => {
      await updateStatusChannel(client, "Bot Online", "🟢");
      await updateStatusEmbed(client, "Bot Status", "Bot is online and ready!", 0x00ff00);
    }, 3000);
  },
};
