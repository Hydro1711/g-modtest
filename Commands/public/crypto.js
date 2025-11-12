const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Get cryptocurrency info")
    .addSubcommand(sub =>
      sub
        .setName("price")
        .setDescription("Check live price of a cryptocurrency")
        .addStringOption(opt =>
          opt.setName("coin").setDescription("Coin name or symbol (e.g., btc, eth)").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("chart")
        .setDescription("Show 7-day price chart for a coin")
        .addStringOption(opt =>
          opt.setName("coin").setDescription("Coin name or symbol (e.g., btc, eth)").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const coin = interaction.options.getString("coin").toLowerCase();

    await interaction.deferReply();

    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}`);
      if (!res.ok) return interaction.editReply({ content: "❌ Invalid coin name or API error." });
      const data = await res.json();

      if (sub === "price") {
        const embed = new EmbedBuilder()
          .setTitle(`💰 ${data.name} (${data.symbol.toUpperCase()})`)
          .setThumbnail(data.image.large)
          .setColor("Gold")
          .addFields(
            { name: "💵 Current Price", value: `$${data.market_data.current_price.usd.toLocaleString()}`, inline: true },
            { name: "📈 24h Change", value: `${data.market_data.price_change_percentage_24h.toFixed(2)}%`, inline: true },
            { name: "💰 Market Cap", value: `$${data.market_data.market_cap.usd.toLocaleString()}`, inline: true }
          )
          .setFooter({ text: "Data from CoinGecko" })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "chart") {
        const chart = `https://quickchart.io/chart?c={type:'line',data:{labels:[1,2,3,4,5,6,7],datasets:[{label:'${data.name} (USD)',data:[${data.market_data.sparkline_7d.price.slice(-7).join(",")}]}]}}`;
        const embed = new EmbedBuilder()
          .setTitle(`📊 ${data.name} 7-Day Price Chart`)
          .setImage(chart)
          .setColor("Blurple")
          .setFooter({ text: "Chart generated via QuickChart & CoinGecko" });
        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error(err);
      return interaction.editReply({ content: "❌ Could not fetch cryptocurrency data." });
    }
  },
};
