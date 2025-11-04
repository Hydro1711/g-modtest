const path = require("path");
const { getRandomCatImagePath } = require("../../utils/catPictures");

/**
 * Responds with a random cat image when someone says "syntaxx".
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Message} message
 */
module.exports = async (client, message) => {
  try {
    // Ignore bots
    if (message.author.bot) return;

    // Check message content
    if (!message.content.toLowerCase().includes("syntaxx")) return;

    // Get random cat image path
    const randomImage = await getRandomCatImagePath();
    if (!randomImage) return console.warn("[syntaxxResponder] No cat images found.");

    // Send image to channel
    await message.channel.send({ files: [randomImage] });
  } catch (err) {
    console.error("[syntaxxResponder] Error sending cat image:", err);
  }
};
