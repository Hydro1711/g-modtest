module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (!interaction.inGuild()) return;

      const commandData = {
        moderation: [
          ['/altscanner', '-# Scan a user’s account to check if it might be an alt.'],
          ['/ban', '-# Permanently ban a member.'],
          ['/kick', '-# Kick a member.'],
          ['/nickname', '-# Change a nickname.'],
          ['/purge', '-# Delete messages.'],
          ['/say', '-# Make the bot speak.'],
          ['/setup_modlogs', '-# Set moderation logs.'],
          ['/timeout', '-# Timeout a member.'],
          ['/togglelevels', '-# Toggle leveling.'],
          ['/voicemaster', '-# Voice channel master.'],
          ['/warn', '-# Warn a user.'],
          ['/mute', '-# Mute a user.'],
          ['/unmute', '-# Unmute a user.'],
          ['/setup_mute_role', '-# Set mute role.'],
          ['/mutedlist', '-# Show muted users.'],
          ['/snipe', '-# Last deleted message.'],
          ['/editsnipe', '-# Last edited message.'],
          ['/admin-role', '-# Set admin role.'],
          ['/setup_casino_channel', '-# Set casino channel.']
        ],
        public: [
          ['/ping', '-# Latency.'],
          ['/userinfo', '-# User info.'],
          ['/serverinfo', '-# Server info.'],
          ['/avatar', '-# Avatar.'],
          ['/botinfo', '-# Bot info.'],
          ['/invite', '-# Invite link.'],
          ['/afk', '-# AFK system.'],
          ['/crypto', '-# Crypto tracking.'],
          ['/spotify', '-# Spotify rich embed.'],
          ['/tts', '-# Text to speech.'],
          ['/help', '-# Help menu.']
        ],
        fun: [
          ['/8ball', '-# Magic ball.'],
          ['/meme', '-# Meme.'],
          ['/quote', '-# Quote.'],
          ['/ship', '-# Ship.'],
          ['/hug', '-# Hug.'],
          ['/slap', '-# Slap.'],
          ['/kiss', '-# Kiss.'],
          ['/smoke', '-# Smoke.'],
          ['/minigame', '-# Minigame.']
        ],
        economy: [
          ['/wallet', '-# Chips.'],
          ['/slot', '-# Slot.'],
          ['/roulette', '-# Roulette.'],
          ['/mines', '-# Mines.'],
          ['/claim', '-# Daily.'],
          ['/give', '-# Give chips.'],
          ['/resetallchips', '-# Reset chips.'],
          ['/setup_casino_channel', '-# Set casino channel.']
        ]
      };

      // ---------------------------------------  
      // HELP MENU HANDLER  
      // ---------------------------------------
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
              { label: 'Casino Commands', value: 'economy' },
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

      // ---------------------------------------  
      // HELP BUTTONS (PAGES)  
      // ---------------------------------------
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
              { label: 'Moderation', value: 'moderation' },
              { label: 'Public', value: 'public' },
              { label: 'Fun', value: 'fun' },
              { label: 'Casino', value: 'economy' },
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
        return interaction.reply({
          content: '⚠️ Gambling is not real money. This is for fun only.',
          ephemeral: true,
        });
      }

      // ---------------------------------------  
      // SLASH COMMANDS (FIXED)  
      // ---------------------------------------
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({
            content: "This command is outdated.",
            ephemeral: true,
          });
        }

        console.log(`[DEBUG] Slash command received: ${interaction.commandName} by ${interaction.user.tag}`);

        // ⭐ FIX: Prevent double replies forever
        try {
          await command.execute(interaction, client);
        } catch (err) {
          console.error("Command Error:", err);
          if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: "❌ An internal error occurred.", ephemeral: true });
          }
        }

        return;
      }

      // ---------------------------------------  
      // CONTEXT MENU  
      // ---------------------------------------
      if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({
            content: "This command is outdated.",
            ephemeral: true,
          });
        }

        console.log(`[DEBUG] Context menu received: ${interaction.commandName} by ${interaction.user.tag}`);

        try {
          await command.execute(interaction, client);
        } catch (err) {
          console.error("ContextMenu Error:", err);
          if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({
              content: "❌ An internal error occurred.",
              ephemeral: true,
            });
          }
        }

        return;
      }

      // ---------------------------------------  
      // MUTE MODAL  
      // ---------------------------------------
      if (interaction.isModalSubmit() && interaction.customId.startsWith("mute-modal-")) {
        const command = client.commands.get("Mute");

        if (command?.modal) {
          return command.modal(interaction, client);
        }

        return;
      }

      // ---------------------------------------  
      // CONTACT FORM  
      // ---------------------------------------
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
              { name: "Discord Name", value: discordName, inline: true },
              { name: "Server Name", value: serverName },
              { name: "Message", value: message }
            )
            .setTimestamp();

          await owner.send({ embeds: [contactEmbed] });

          return interaction.editReply({ content: "✅ Your message has been sent!" });

        } catch (error) {
          console.error("Failed to send contact:", error);
          return interaction.editReply({ content: "❌ Could not send your message." });
        }
      }

    } catch (error) {
      console.error(`[ERROR] interactionCreate fatal handler error:`, error);
      // Do NOT attempt a reply here — avoids duplicate-interaction crash
    }
  }
};
