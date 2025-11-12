const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Check cryptocurrency prices and charts with backup APIs.")
    .addSubcommand(sub =>
      sub
        .setName("price")
        .setDescription("Show the current price of a cryptocurrency.")
        .addStringOption(o =>
          o
            .setName("coin")
            .setDescription("Enter coin name or symbol (e.g. BTC, ETH, DOGE).")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("chart")
        .setDescription("Show a 7-day price chart for a cryptocurrency.")
        .addStringOption(o =>
          o
            .setName("coin")
            .setDescription("Enter coin name or symbol (e.g. BTC, ETH, DOGE).")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const coinInput = interaction.options.getString("coin").toLowerCase().trim();

    // ✅ Default response function
    const fail = msg => interaction.editReply(`❌ ${msg}`);

    try {
      // 1️⃣ Try CoinGecko
      let data = null;
      let source = "CoinGecko";
      let name, symbol, priceUSD, change24h, marketCap, image, prices7d;

      try {
        const listRes = await fetch("https://api.coingecko.com/api/v3/coins/list");
        const list = await listRes.json();
        if (!Array.isArray(list)) throw new Error("Bad list");
        const coin = list.find(
          c => c.id === coinInput || c.symbol.toLowerCase() === coinInput
        );
        if (!coin) throw new Error("Coin not found");

        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&sparkline=true`
        );
        const json = await res.json();
        if (!json?.market_data) throw new Error("No data");

        name = json.name;
        symbol = json.symbol;
        priceUSD = json.market_data.current_price.usd;
        change24h = json.market_data.price_change_percentage_24h;
        marketCap = json.market_data.market_cap.usd;
        image = json.image.large;
        prices7d = json.market_data.sparkline_7d?.price;
      } catch {
        console.warn("⚠️ CoinGecko failed, trying CoinPaprika…");

        // 2️⃣ Try CoinPaprika
        try {
          source = "CoinPaprika";
          const res = await fetch("https://api.coinpaprika.com/v1/coins");
          const list = await res.json();
          if (!Array.isArray(list)) throw new Error("Bad list");
          const coin = list.find(
            c => c.id === coinInput || c.symbol.toLowerCase() === coinInput
          );
          if (!coin) throw new Error("Coin not found");

          const details = await fetch(
            `https://api.coinpaprika.com/v1/tickers/${coin.id}`
          );
          const json = await details.json();
          if (!json?.quotes?.USD) throw new Error("No data");

          name = json.name;
          symbol = json.symbol;
          priceUSD = json.quotes.USD.price;
          change24h = json.quotes.USD.percent_change_24h;
          marketCap = json.quotes.USD.market_cap;
          image = `https://cryptologos.cc/logos/${symbol.toLowerCase()}-${symbol.toLowerCase()}-logo.png`;
          prices7d = null; // Paprika doesn't have sparkline
        } catch {
          console.warn("⚠️ CoinPaprika failed, trying CryptoCompare…");

          // 3️⃣ Try CryptoCompare (price-only)
          try {
            source = "CryptoCompare";
            const res = await fetch(
              `https://min-api.cryptocompare.com/data/price?fsym=${coinInput.toUpperCase()}&tsyms=USD`
            );
            const json = await res.json();
            if (!json?.USD) throw new Error("Invalid coin");

            name = coinInput.toUpperCase();
            symbol = coinInput.toUpperCase();
            priceUSD = json.USD;
            change24h = "N/A";
            marketCap = "N/A";
            image = "https://cryptologos.cc/logos/bitcoin-btc-logo.png";
            prices7d = null;
          } catch {
            return fail("All crypto APIs are currently unavailable. Try again later.");
          }
        }
      }

      // ✅ Build embed
      const embed = new EmbedBuilder()
        .setTitle(`💰 ${name} (${symbol.toUpperCase()})`)
        .setColor("#2ecc71")
        .setThumbnail(image)
        .addFields(
          { name: "💵 Price", value: `$${priceUSD.toLocaleString()}`, inline: true },
          {
            name: "📈 24h Change",
            value: typeof change24h === "number" ? `${change24h.toFixed(2)}%` : change24h,
            inline: true,
          },
          {
            name: "💰 Market Cap",
            value: marketCap !== "N/A" ? `$${marketCap.toLocaleString()}` : "N/A",
            inline: true,
          }
        )
        .setFooter({ text: `Source: ${source}` })
        .setTimestamp();

      // Chart (only if we have data)
      if (sub === "chart" && prices7d?.length) {
        const chartURL = `https://quickchart.io/chart?c={type:'line',data:{labels:[1,2,3,4,5,6,7],datasets:[{label:'Price (7d)',data:[${prices7d
          .slice(-7)
          .map(p => p.toFixed(2))
          .join(",")}],borderColor:'rgb(75,192,192)',fill:false}]}}`;
        embed.setImage(chartURL);
      } else if (sub === "chart") {
        embed.setDescription("⚠️ Chart unavailable for this source.");
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await fail("Unexpected internal error.");
    }
  },
};
