const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

async function fetchCryptoData(coin) {
  const id = coin.toLowerCase();

  // Try CoinGecko first
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}`);
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

  // Try CryptoCompare as fallback
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${id.toUpperCase()}&tsyms=USD`);
    const data = await res.json();
    const coinData = data.DISPLAY?.[id.toUpperCase()]?.USD;
    if (coinData) {
      return {
        name: id.toUpperCase(),
        symbol: id.toUpperCase(),
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("💰 Get live cryptocurrency info (no subcommands).")
    .addStringOption(option =>
      option
        .setName("coin")
        .setDescription("Enter a cryptocurrency name or symbol (e.g. bitcoin, eth)")
        .setRequired(true)
        .addChoices(
          { name: "Bitcoin (BTC)", value: "bitcoin" },
          { name: "Ethereum (ETH)", value: "ethereum" },
          { name: "Dogecoin (DOGE)", value: "dogecoin" },
          { name: "Solana (SOL)", value: "solana" },
          { name: "BNB", value: "binancecoin" },
          { name: "Cardano (ADA)", value: "cardano" },
          { name: "XRP", value: "xrp" },
          { name: "Litecoin (LTC)", value: "litecoin" },
          { name: "Polkadot (DOT)", value: "polkadot" },
          { name: "Avalanche (AVAX)", value: "avalanche" }
        )
    ),

  async execute(interaction) {
    const coin = interaction.options.getString("coin");
    await interaction.deferReply();

    try {
      const data = await fetchCryptoData(coin);
      if (!data) {
        return interaction.editReply("❌ Could not fetch crypto data. Try again.");
      }

      const embed = new EmbedBuilder()
        .setColor("#2b6cb0")
        .setTitle(`${data.name} (${data.symbol})`)
        .setThumbnail(data.image || null)
        .addFields(
          { name: "💰 Price", value: `$${data.price.toLocaleString()}`, inline: true },
          { name: "📉 24h Change", value: `${data.change24h.toFixed(2)}%`, inline: true },
          { name: "🏦 Market Cap", value: `$${data.marketCap.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: `Source: ${data.source} • Updated ${new Date().toLocaleTimeString()}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ An error occurred while fetching crypto data.");
    }
  },
};
