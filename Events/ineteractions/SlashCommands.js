module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (!interaction.inGuild()) return;

      const commandData = {
        moderation: [
          ['/altscanner', '-# Scan a user’s account to check if it might be an alt.'],
          ['/ban', '-# Permanently ban a member from the server.'],
          ['/clear', '-# Delete a number of messages from a channel (max 100).'],
          ['/dm_member', '-# Send a direct message to a user as the bot.'],
          ['/give', '-# Add chips to a user’s account.'],
          ['/kick', '-# Remove a member from the server.'],
          ['/mute', '-# Permanently mute a member.'],
          ['/purge', '-# Delete all messages from a user from the last 24 hours.'],
          ['/rename', '-# Change the bot’s nickname.'],
          ['/say', '-# Make the bot say a message in this channel.'],
          ['/setclearedlog_channel', '-# Log where cleared messages will be posted.'],
          ['/setup_casino_channel', '-# Set the channel where casino games can be used.'],
          ['/setup_memberlog', '-# Set the channel that shows join/leave logs.'],
          ['/setup_modlogs', '-# Set the channel for moderation action logs.'],
          ['/setup_mute_role', '-# Assign the mute role to use for mutes.'],
          ['/setup_verify_channel', '-# Set the verification channel.'],
          ['/setup_verification_role', '-# Choose the verification role.'],
          ['/takechips', '-# Remove chips from a user.'],
          ['/timeout', '-# Temporarily timeout a user.'],
          ['/unmute', '-# Remove permanent mute from a user.'],
        ],

        public: [
          ['/afk', '-# Set your AFK status.'],
          ['/contact', '-# Send a message to the bot owner.'],
          ['/help', '-# Open the interactive help menu.'],
          ['/memberinfo', '-# (Outdated) Show info about a member.'],
          ['/mc-info', '-# Check if a Minecraft server is online.'],
          ['/qr', '-# Generate a QR code from any text or URL.'],
        ],

        fun: [
          ['/ascii', '-# Turn text into ASCII art.'],
          ['/ping', '-# Show the bot’s latency.'],
          ['/whatifyelled', '-# Simulate yelling a message at night.'],
        ],

        casino: [
          ['/roulette', '-# Bet chips in roulette.'],
          ['/slot', '-# Spin a slot machine.'],
          ['/mines', '-# Mines game. Pick tiles, avoid bombs.'],
        ],
      };

      // CATEGORY VALUE FIX MAP
      const categoryMap = {
        Developer: "moderation",
        Moderation: "moderation",
        Public: "public",
        Fun: "fun",
        Economy: "casino"
      };

      // SELECT MENU HANDLER
      if (interaction.isStringSelectMenu() && interaction.customId === 'help-category') {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

        const rawCategory = interaction.values[0];
        const category = categoryMap[rawCategory] || rawCategory;
        const commands = commandData[category];

        if (!commands) {
          return interaction.update({
            content: "❌ Category not found.",
            components: []
          });
        }

        const perPage = 6;
        const page = 0;
        const totalPages = Math.ceil(commands.length / perPage);

        const embed = new EmbedBuilder()
          .setTitle(`📂 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
          .setDescription(
            commands
              .slice(0, perPage)
              .map(([c, d]) => `**${c}**\n${d}`)
              .join('\n\n')
          )
          .setColor('#2C2F33');

        const paginationRow = new ActionRowBuilder().addComponents(
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

        const warnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('help-warning')
            .setLabel('⚠️ Warning')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          embeds: [embed],
          components: [dropdown, paginationRow, warnRow],
        });

        return;
      }

      // PAGINATION BUTTONS
      if (interaction.isButton() && interaction.customId.startsWith("help-")) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

        const parts = interaction.customId.split("-");
        const category = parts[1];
        const direction = parts[2];
        const page = parseInt(parts[3]);

        const commands = commandData[category];
        if (!commands) return;

        const perPage = 6;
        const totalPages = Math.ceil(commands.length / perPage);

        const newPage = direction === "next" ? page : page - 2;

        const embed = new EmbedBuilder()
          .setTitle(
            `📂 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands (Page ${newPage + 1})`
          )
          .setDescription(
            commands
              .slice(newPage * perPage, (newPage + 1) * perPage)
              .map(([c, d]) => `**${c}**\n${d}`)
              .join("\n\n")
          )
          .setColor("#2C2F33");

        const paginationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help-${category}-prev-${newPage}`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(newPage === 0),
          new ButtonBuilder()
            .setCustomId(`help-${category}-next-${newPage + 1}`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(newPage + 1 >= totalPages)
        );

        const dropdown = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("help-category")
            .setPlaceholder("📂 Choose a category")
            .addOptions([
              { label: "Moderation Commands", value: "moderation" },
              { label: "Public Commands", value: "public" },
              { label: "Fun Commands", value: "fun" },
              { label: "Casino Commands", value: "casino" },
            ])
        );

        const warnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("help-warning")
            .setLabel("⚠️ Warning")
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          embeds: [embed],
          components: [dropdown, paginationRow, warnRow],
        });

        return;
      }

      // WARNING BUTTON
      if (interaction.isButton() && interaction.customId === "help-warning") {
        await interaction.reply({
          content: "⚠️ Gambling is not real money. Play responsibly.",
          ephemeral: true,
        });
        return;
      }

      // SLASH COMMANDS
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({
            content: "This command is outdated.",
            ephemeral: true,
          });
        }

        await command.execute(interaction, client);
        return;
      }

      // CONTEXT MENU COMMANDS
      if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({
            content: "This command is outdated.",
            ephemeral: true,
          });
        }

        await command.execute(interaction, client);
        return;
      }

      // MUTE MODAL
      if (interaction.isModalSubmit() && interaction.customId.startsWith("mute-modal-")) {
        const command = client.commands.get("Mute");
        if (command?.modal) {
          return command.modal(interaction, client);
        }
      }

      // CONTACT MODAL
      if (interaction.isModalSubmit() && interaction.customId === "contactModal") {
        await interaction.deferReply({ ephemeral: true });

        const discordName = interaction.fields.getTextInputValue("discordNameInput");
        const serverName = interaction.fields.getTextInputValue("serverNameInput");
        const message = interaction.fields.getTextInputValue("messageInput");

        const ownerId = "981643067792711722";

        try {
          const owner = await client.users.fetch(ownerId);
          const { EmbedBuilder } = require("discord.js");

          const embed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("📩 New Contact Message")
            .addFields(
              { name: "From User", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
              { name: "Discord Name (typed)", value: discordName, inline: true },
              { name: "Server Name", value: serverName },
              { name: "Message", value: message },
            )
            .setTimestamp();

          await owner.send({ embeds: [embed] });

          await interaction.editReply({
            content: "✅ Your message has been sent to Syntaxx. Thank you!",
          });

        } catch (err) {
          console.error(err);
          await interaction.editReply({
            content: "❌ Failed to send your message. Try later.",
          });
        }

        return;
      }

    } catch (error) {
      console.error(`[ERROR] interactionCreate handler error:`, error);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "❌ An error occurred while executing the command.",
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while executing the command.",
          ephemeral: true,
        });
      }
    }
  },
};
