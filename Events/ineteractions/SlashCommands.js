module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (!interaction.inGuild()) return;

      const commandData = {
  moderation: [
    ['/altscanner', '-# Scan a user’s account to check if it might be an alt.'],
    ['/ban', '-# Permanently ban a member from the server.'],
    ['/kick', '-# Remove a member from the server.'],
    ['/nickname', '-# Change a user’s nickname.'],
    ['/purge', '-# Delete a number of messages.'],
    ['/say', '-# Make the bot say something.'],
    ['/setup_modlogs', '-# Set the moderation logs channel.'],
    ['/timeout', '-# Timeout a user.'],
    ['/togglelevels', '-# Enable or disable leveling system.'],
    ['/voicemaster', '-# Create/manage voice channels.'],
    ['/warn', '-# Warn a user.'],
    ['/mute', '-# Mute a member.'],
    ['/unmute', '-# Unmute a member.'],
    ['/setup_mute_role', '-# Set the mute role.'],
    ['/mutedlist', '-# Show muted users.'],
    ['/snipe', '-# View last deleted message.'],
    ['/editsnipe', '-# View last edited message.'],
    ['/admin-role', '-# Set the admin role.'],
    ['/setup_casino_channel', '-# Set the casino channel.']
  ],

  public: [
    ['/ping', '-# Show latency.'],
    ['/userinfo', '-# Show user info.'],
    ['/serverinfo', '-# Show server info.'],
    ['/avatar', '-# Show avatar of a user.'],
    ['/botinfo', '-# Show bot info.'],
    ['/invite', '-# Bot invite link.'],
    ['/afk', '-# Set an AFK message.'],
    ['/crypto', '-# Track crypto data.'],
    ['/spotify', '-# Show Spotify track info.'],
    ['/tts', '-# Convert text to speech.'],
    ['/help', '-# Display the help menu.']
  ],

  fun: [
    ['/8ball', '-# Ask the magic 8-ball.'],
    ['/meme', '-# Random meme.'],
    ['/quote', '-# Random quote.'],
    ['/ship', '-# Ship two people.'],
    ['/hug', '-# Hug someone.'],
    ['/slap', '-# Slap someone.'],
    ['/kiss', '-# Kiss someone.'],
    ['/smoke', '-# Smoke command.'],
    ['/minigame', '-# Play a small minigame.']
  ],

  economy: [
    ['/wallet', '-# Check your chips.'],
    ['/slot', '-# Play slots.'],
    ['/roulette', '-# Roulette casino game.'],
    ['/mines', '-# Mines casino game.'],
    ['/claim', '-# Claim daily chips.'],
    ['/give', '-# Give chips to a user.'],
    ['/resetallchips', '-# Reset everyone’s chips.'],
    ['/setup_casino_channel', '-# Set the casino channel.']
  ],

  developer: [
    ['/createlink', '-# Create a bot invite link.'],
    ['/takechips', '-# Remove chips from a user.'],
    ['/leaveserver', '-# Make the bot leave a server.'],
    ['/restart', '-# Restart the bot.'],
    ['/server-list', '-# Show servers bot is in.'],
    ['/reload', '-# Reload a command.'],
    ['/reset_levels', '-# Reset levels.']
  ]
};


      if (interaction.isStringSelectMenu() && interaction.customId === 'help-category') {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

        const category = interaction.values[0];
        const commands = commandData[category];
        const page = 0;
        const perPage = 6;
        const totalPages = Math.ceil(commands.length / perPage);

        const embed = new EmbedBuilder()
          .setTitle(`📂 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
          .setDescription(commands.slice(0, perPage).map(([c, d]) => `**${c}**\n${d}`).join('\n\n'))
          .setColor('#2C2F33');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help-${category}-prev-${page}`)
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`help-${category}-next-${page + 1}`)
            .setLabel('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalPages <= 1)
        );

        const dropdown = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help-category')
            .setPlaceholder('📂 Choose a category')
            .addOptions([
              { label: 'Moderation Commands', value: 'moderation' },
              { label: 'Public Commands', value: 'public' },
              { label: 'Fun Commands', value: 'fun' },
              { label: 'Casino Commands', value: 'casino' },
            ])
        );

        const warningBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('help-warning')
            .setLabel('⚠️ Warning')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          embeds: [embed],
          components: [dropdown, row, warningBtn],
        });
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith('help-')) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

        const [_, category, dir, pageStr] = interaction.customId.split('-');
        const page = parseInt(pageStr);
        const perPage = 6;
        const commands = commandData[category];
        const totalPages = Math.ceil(commands.length / perPage);
        const newPage = dir === 'next' ? page : page - 2;

        const embed = new EmbedBuilder()
          .setTitle(`📂 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands (Page ${newPage + 1})`)
          .setDescription(commands.slice(newPage * perPage, (newPage + 1) * perPage).map(([c, d]) => `**${c}**\n${d}`).join('\n\n'))
          .setColor('#2C2F33');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help-${category}-prev-${newPage}`)
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(newPage === 0),
          new ButtonBuilder()
            .setCustomId(`help-${category}-next-${newPage + 1}`)
            .setLabel('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(newPage + 1 >= totalPages)
        );

        const dropdown = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('help-category')
            .setPlaceholder('📂 Choose a category')
            .addOptions([
              { label: 'Moderation Commands', value: 'moderation' },
              { label: 'Public Commands', value: 'public' },
              { label: 'Fun Commands', value: 'fun' },
              { label: 'Casino Commands', value: 'casino' },
            ])
        );

        const warningBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('help-warning')
            .setLabel('⚠️ Warning')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          embeds: [embed],
          components: [dropdown, row, warningBtn],
        });
        return;
      }

      if (interaction.isButton() && interaction.customId === 'help-warning') {
        await interaction.reply({
          content: '⚠️ **Gambling is not safe and this is not real money. Use it for fun only.**',
          ephemeral: true,
        });
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({
            content: "This command is outdated.",
            ephemeral: true,
          });
        }
        console.log(`[DEBUG] Slash command received: ${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction, client);
        return;
      }

      if (
        interaction.isUserContextMenuCommand() ||
        interaction.isMessageContextMenuCommand()
      ) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({
            content: "This command is outdated.",
            ephemeral: true,
          });
        }
        console.log(`[DEBUG] Context menu command received: ${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction, client);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("mute-modal-")) {
        const command = client.commands.get("Mute");
        if (command && typeof command.modal === "function") {
          console.log(`[DEBUG] Mute modal submitted by ${interaction.user.tag}`);
          return command.modal(interaction, client);
        }
      }

      if (interaction.isModalSubmit() && interaction.customId === "contactModal") {
        console.log(`[DEBUG] Contact modal submitted by ${interaction.user.tag}`);

        await interaction.deferReply({ ephemeral: true });

        const discordName = interaction.fields.getTextInputValue("discordNameInput");
        const serverName = interaction.fields.getTextInputValue("serverNameInput");
        const message = interaction.fields.getTextInputValue("messageInput");
        const ownerId = "981643067792711722";

        try {
          const owner = await client.users.fetch(ownerId);

          const { EmbedBuilder } = require("discord.js");
          const contactEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("📩 New Contact Message")
            .addFields(
              { name: "From User", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
              { name: "Discord Name (typed)", value: discordName, inline: true },
              { name: "Server Name", value: serverName },
              { name: "Message", value: message }
            )
            .setTimestamp();

          await owner.send({ embeds: [contactEmbed] });

          await interaction.editReply({ content: "✅ Your message has been sent to Syntaxx. Thank you!" });
        } catch (error) {
          console.error("Failed to send contact message:", error);
          await interaction.editReply({
            content: "❌ I was unable to send your message. Please try again later.",
          });
        }
        return;
      }

    } catch (error) {
      console.error(`[ERROR] interactionCreate handler error:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "❌ An error occurred while executing the command." });
      } else {
        await interaction.reply({ content: "❌ An error occurred while executing the command.", ephemeral: true });
      }
    }
  },
};

