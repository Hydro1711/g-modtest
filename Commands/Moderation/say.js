const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  EmbedBuilder 
} = require("discord.js");
const { DeveloperID } = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message or embed via the bot")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel to send the message")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Check user permissions or developer override
    if (
      interaction.user.id !== DeveloperID && 
      !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return interaction.reply({ 
        content: "<a:Pretend_tick:1278355749843767348> You need the **Manage Messages** permission to use this command.", 
        ephemeral: true 
      });
    }

    const channel = interaction.options.getChannel("channel") || interaction.channel;

    // Create modal
    const modal = new ModalBuilder()
      .setCustomId("say_modal")
      .setTitle("Send message via bot");

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("Embed Title (optional, max 256 chars)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const descriptionInput = new TextInputBuilder()
      .setCustomId("description")
      .setLabel("Description (required)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const colorInput = new TextInputBuilder()
      .setCustomId("color")
      .setLabel("Embed Color (hex or name, optional)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const imageInput = new TextInputBuilder()
      .setCustomId("image")
      .setLabel("Image URL (optional)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const embedToggleInput = new TextInputBuilder()
      .setCustomId("embed_toggle")
      .setLabel("Embed mode? (on/off)")
      .setPlaceholder("Type 'on' or 'off'")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(embedToggleInput)
    );

    await interaction.showModal(modal);

    try {
      const response = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.customId === "say_modal" && i.user.id === interaction.user.id,
      });

      const title = response.fields.getTextInputValue("title").slice(0, 256);
      const description = response.fields.getTextInputValue("description").slice(0, 4096);
      const colorRaw = response.fields.getTextInputValue("color").trim();
      const imageUrl = response.fields.getTextInputValue("image").trim();
      const embedToggle = response.fields.getTextInputValue("embed_toggle").toLowerCase();

      // ✅ Only check @everyone/@here now that description exists
      if (description.includes("@everyone") || description.includes("@here")) {
        const botMember = await interaction.guild.members.fetchMe();
        const botPerms = channel.permissionsFor(botMember);
        if (!botPerms.has(PermissionFlagsBits.MentionEveryone)) {
          return response.reply({ 
            content: `⚠️ I don't have permission to mention everyone or roles in ${channel}. Please adjust my permissions.`, 
            ephemeral: true 
          });
        }
      }

      if (embedToggle === "on") {
        let embed;
        try {
          embed = new EmbedBuilder()
            .setDescription(description)
            .setColor(colorRaw || "Blue");

          if (title) embed.setTitle(title);

          if (imageUrl && /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(imageUrl)) {
            embed.setImage(imageUrl);
          }
        } catch (colorError) {
          return response.reply({ 
            content: `<a:Pretend_cross:1278355750913183754> Invalid color provided. Please use a valid hex color or color name (e.g. Blue).`, 
            ephemeral: true 
          });
        }

        await channel.send({ embeds: [embed], allowedMentions: { parse: ["users", "roles", "everyone"] } });
        console.log(`[Say Command] User ${interaction.user.tag} sent an embed in #${channel.name}: Title="${title || 'none'}", Description="${description}", Color="${colorRaw || 'Blue'}", Image="${imageUrl || 'none'}"`);
      } else {
        await channel.send({ content: description, allowedMentions: { parse: ["users", "roles", "everyone"] } });
        console.log(`[Say Command] User ${interaction.user.tag} sent a plain message in #${channel.name}: "${description}"`);
      }

      await response.reply({ content: "<a:Pretend_tick:1278355749843767348> Your message has been sent!", ephemeral: true });

    } catch (error) {
      console.error("[Say Command] Modal submission error:", error);
    }
  },
};
