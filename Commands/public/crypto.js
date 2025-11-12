const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

// --- Helper: Timeout Fetch ---
const timeoutFetch = (url, ms = 5000) =>
  Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    ),
  ]);

// --- Helper: Fallback API Fetch ---
async function fetchCryptoData(coin) {
  const symbol = coin.toLowerCase();

  // 1️⃣ CoinGecko
  try {
    const res = await timeoutFetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${symbol}`
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const c = data[0];
      return {
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        price: c.current_price,
        change24h: c.price_change_percentage_24h,
        marketCap: c.market_cap,
        image: c.image,
        source: "CoinGecko",
      };
    }
  } catch {}

  // 2️⃣ CoinPaprika
  try {
    const listRes = await timeoutFetch("https://api.coinpaprika.com/v1/coins");
    const list = await listRes.json();
    const match = list.find(
      (c) =>
        c.symbol.toLowerCase() === symbol ||
        c.name.toLowerCase() === symbol ||
        c.id.toLowerCase().includes(symbol)
    );

    if (match) {
      const infoRes = await timeoutFetch(
        `https://api.coinpaprika.com/v1/tickers/${match.id}`
      );
      const info = await infoRes.json();
      return {
        name: info.name,
        symbol: info.symbol,
        price: info.quotes.USD.price,
        change24h: info.quotes.USD.percent_change_24h,
        marketCap: info.quotes.USD.market_cap,
        image: null,
        source: "CoinPaprika",
      };
    }
  } catch {}

  // 3️⃣ CryptoCompare
  try {
    const res = await timeoutFetch(
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbol.toUpperCase()}&tsyms=USD`
    );
    const data = await res.json();
    const coinData = data.DISPLAY?.[symbol.toUpperCase()]?.USD;
    if (coinData) {
      return {
        name: symbol.toUpperCase(),
        symbol: symbol.toUpperCase(),
        price: coinData.PRICE,
        change24h: coinData.CHANGEPCT24HOUR,
        marketCap: coinData.MKTCAP,
        image: `https://www.cryptocompare.com${coinData.IMAGEURL}`,
        source: "CryptoCompare",
      };
    }
  } catch {}

  return null;
}

// --- Main Command ---
module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("💰 Get live cryptocurrency information.")
    .addStringOption((option) =>
      option
        .setName("coin")
        .setDescription("Choose a cryptocurrency or enter a name manually.")
        .setRequired(true)
        .addChoices(
          { name: "Bitcoin (BTC)", value: "bitcoin" },
          { name: "Ethereum (ETH)", value: "ethereum" },
          { name: "Dogecoin (DOGE)", value: "dogecoin" },
          { name: "Solana (SOL)", value: "solana" },
          { name: "XRP (XRP)", value: "xrp" },
          { name: "Cardano (ADA)", value: "cardano" },
          { name: "Litecoin (LTC)", value: "litecoin" },
          { name: "BNB (BNB)", value: "binancecoin" },
          { name: "Polkadot (DOT)", value: "polkadot" },
          { name: "Avalanche (AVAX)", value: "avalanche" }
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("price")
        .setDescription("Shows the current price of a cryptocurrency.")
        .addStringOption((opt) =>
          opt
            .setName("coin")
            .setDescription("Cryptocurrency name or symbol")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("chart")
        .setDescription("Displays a 7-day price chart of a cryptocurrency.")
        .addStringOption((opt) =>
          opt
            .setName("coin")
            .setDescription("Cryptocurrency name or symbol")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const sub = interaction.options.getSubcommand();
      const coinInput =
        interaction.options.getString("coin")?.toLowerCase() || "bitcoin";

      await interaction.deferReply();

      const data = await fetchCryptoData(coinInput);
      if (!data) {
        return await interaction.editReply({
          content: "❌ API error or invalid coin name.",
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#2b6cb0")
        .setTitle(`${data.name} (${data.symbol})`)
        .setDescription(
          sub === "chart"
            ? "⚠️ Chart unavailable for this source."
            : "Live cryptocurrency data"
        )
        .addFields(
          {
            name: "💰 Price",
            value:
              typeof data.price === "number"
                ? `$${data.price.toLocaleString()}`
                : data.price,
            inline: true,
          },
          {
            name: "📉 24h Change",
            value:
              typeof data.change24h === "number"
                ? `${data.change24h.toFixed(2)}%`
                : `${data.change24h}%`,
            inline: true,
          },
          {
            name: "🏦 Market Cap",
            value:
              typeof data.marketCap === "number"
                ? `$${data.marketCap.toLocaleString()}`
                : data.marketCap,
            inline: true,
          }
        )
        .setFooter({
          text: `Source: ${data.source} • ${new Date().toLocaleTimeString()}`,
        });

      if (data.image) embed.setThumbnail(data.image);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[CRYPTO CMD ERROR]", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Error executing crypto command.",
          ephemeral: true,
        });
      } else {
        await interaction.editReply({
          content: "❌ An unexpected error occurred.",
        });
      }
    }
  },
};
