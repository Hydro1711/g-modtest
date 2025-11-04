const fetch = require("node-fetch");

async function getRandomCarImagePath() {
  try {
    const res = await fetch("https://api.unsplash.com/photos/random?query=car&client_id=YOUR_UNSPLASH_ACCESS_KEY");
    const data = await res.json();
    return data.urls?.regular || null;
  } catch (err) {
    console.error("Failed to fetch car image:", err);
    return null;
  }
}

module.exports = { getRandomCarImagePath };
