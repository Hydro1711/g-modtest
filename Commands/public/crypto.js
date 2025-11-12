const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Get live cryptocurrency info.")
    .addStringOption(option =>
      option
        .setName("coin")
        .setDescription("Enter the coin name or symbol (e.g. BTC, ETH, DOGE).")
        .setRequired(true)
    )
    .addSubcommand(sub =>
      sub
        .setName("price")
        .setDescription("Show the current price of a cryptocurrency.")
        .addStringOption(o =>
          o
            .setName("coin")
            .setDescription("Enter coin name or symbol (e.g. BTC, ETH).")
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
            .setDescription("Enter coin name or symbol (e.g. BTC, ETH).")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const coinInput =
      interaction.options.getString("coin").toLowerCase().trim();

    try {
      // 🔍 Get full coin list (to support symbols like btc)
      const listRes = await fetch("https://api.coingecko.com/api/v3/coins/list");
      const list = await listRes.json();

      const coin = list.find(
        c => c.id === coinInput || c.symbol.toLowerCase() === coinInput
      );

      if (!coin)
        return interaction.editReply("❌ Invalid coin name or symbol.");

      // Fetch current data
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&sparkline=true`
      );
      const data = await res.json();

      if (!data || !data.market_data)
        return interaction.editReply("❌ Couldn't fetch coin data.");

      const embed = new EmbedBuilder()
        .setTitle(`💰 ${data.name} (${data.symbol.toUpperCase()})`)
        .setThumbnail(data.image.large)
        .setColor("#2ecc71")
        .addFields(
          {
            name: "💵 Current Price",
            value: `$${data.market_data.current_price.usd.toLocaleString()}`,
            inline: true,
          },
          {
            name: "📈 24h Change",
            value: `${data.market_data.price_change_percentage_24h.toFixed(2)}%`,
            inline: true,
          },
          {
            name: "💰 Market Cap",
            value: `$${data.market_data.market_cap.usd.toLocaleString()}`,
            inline: true,
          }
        )
        .setFooter({ text: "Data provided by CoinGecko" })
        .setTimestamp();

      if (sub === "chart") {
        const chartURL = `https://quickchart.io/chart?c={type:'line',data:{labels:[1,2,3,4,5,6,7],datasets:[{label:'Price (7d)',data:[${data.market_data.sparkline_7d.price
          .slice(-7)
          .map(p => p.toFixed(2))
          .join(",")}],borderColor:'rgb(75,192,192)',fill:false}]}}`;

        embed.setImage(chartURL);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ API error or invalid coin name.");
    }
  },
};
