const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

const timeoutFetch = (url, ms = 6000) =>
  Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);

// Tries 3 APIs: CoinGecko → CoinPaprika → CryptoCompare
async function fetchCryptoData(symbolInput) {
  const query = symbolInput.toLowerCase().trim();

  // ✅ CoinGecko (most reliable)
  try {
    const res = await timeoutFetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(query)}`
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

    // 🪙 fallback: if direct ID fails, try search endpoint
    const searchRes = await timeoutFetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );
    const search = await searchRes.json();
    if (search.coins?.length > 0) {
      const id = search.coins[0].id;
      const secondRes = await timeoutFetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}`
      );
      const data2 = await secondRes.json();
      if (Array.isArray(data2) && data2.length > 0) {
        const c = data2[0];
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
    }
  } catch (err) {
    console.warn("[CoinGecko error]", err.message);
  }

  // ✅ CoinPaprika fallback
  try {
    const listRes = await timeoutFetch("https://api.coinpaprika.com/v1/coins");
    const list = await listRes.json();
    const match = list.find(
      (c) =>
        c.symbol.toLowerCase() === query ||
        c.name.toLowerCase() === query ||
        c.id.toLowerCase().includes(query)
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
  } catch (err) {
    console.warn("[CoinPaprika error]", err.message);
  }

  // ✅ CryptoCompare fallback
  try {
    const res = await timeoutFetch(
      `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${query.toUpperCase()}&tsyms=USD`
    );
    const data = await res.json();
    const coinData = data.DISPLAY?.[query.toUpperCase()]?.USD;
    if (coinData) {
      return {
        name: query.toUpperCase(),
        symbol: query.toUpperCase(),
        price: coinData.PRICE,
        change24h: parseFloat(coinData.CHANGEPCT24HOUR),
        marketCap: coinData.MKTCAP,
        image: `https://www.cryptocompare.com${coinData.IMAGEURL}`,
        source: "CryptoCompare",
      };
    }
  } catch (err) {
    console.warn("[CryptoCompare error]", err.message);
  }

  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("💰 Get real-time crypto prices (3-API fallback).")
    .addStringOption((opt) =>
      opt
        .setName("coin")
        .setDescription("Enter coin name or symbol (e.g. bitcoin, eth, solana)")
        .setRequired(true)
        .addChoices(
          { name: "Bitcoin (BTC)", value: "bitcoin" },
          { name: "Ethereum (ETH)", value: "ethereum" },
          { name: "Dogecoin (DOGE)", value: "dogecoin" },
          { name: "Solana (SOL)", value: "solana" },
          { name: "Cardano (ADA)", value: "cardano" },
          { name: "BNB", value: "binancecoin" },
          { name: "XRP", value: "xrp" },
          { name: "Litecoin (LTC)", value: "litecoin" },
          { name: "Avalanche (AVAX)", value: "avalanche" },
          { name: "Polkadot (DOT)", value: "polkadot" }
        )
    ),

  async execute(interaction) {
    const coin = interaction.options.getString("coin");

    try {
      await interaction.deferReply();

      const data = await fetchCryptoData(coin);
      if (!data) {
        return interaction.editReply({
          content: "❌ Could not fetch crypto data. Try again later.",
        });
      }

      const embed = new EmbedBuilder()
        .setColor(data.change24h >= 0 ? 0x2ecc71 : 0xe74c3c)
        .setTitle(`${data.name} (${data.symbol})`)
        .setDescription("📊 Real-time cryptocurrency data")
        .addFields(
          {
            name: "💰 Price",
            value:
              typeof data.price === "number"
                ? `$${data.price.toLocaleString()}`
                : `${data.price}`,
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
                : `${data.marketCap}`,
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
      await interaction.editReply({
        content: "❌ An unexpected error occurred while fetching crypto data.",
      });
    }
  },
};
