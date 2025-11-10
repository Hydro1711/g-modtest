const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Get a random meme from Reddit."),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const { data } = await axios.get("https://meme-api.com/gimme");
      const embed = new EmbedBuilder()
        .setTitle(data.title)
        .setURL(data.postLink)
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` })
        .setColor("Blue");

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Meme API error:", error);
      await interaction.editReply("Failed to fetch a meme. Try again later!");
    }
  },
};
