const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .setDescription("Convert text to speech")
    .addStringOption(option =>
      option.setName("text").setDescription("Text to convert to speech").setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("lang")
        .setDescription("Language code (default: en)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const text = interaction.options.getString("text");
    const lang = interaction.options.getString("lang") || "en";
    const encodedText = encodeURIComponent(text);

    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const filePath = path.join(__dirname, "tts.mp3");
      fs.writeFileSync(filePath, Buffer.from(buffer));

      const audio = new AttachmentBuilder(filePath, { name: "tts.mp3" });
      await interaction.editReply({ content: `🗣️ Generated TTS (${lang.toUpperCase()})`, files: [audio] });
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ Failed to generate TTS audio." });
    }
  },
};
