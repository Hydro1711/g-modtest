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
          ['/rename', '-# Change bot nickname.'],
          ['/say', '-# Make bot say something.'],
          ['/setclearedlog_channel', '-# Set cleared-messages log channel.'],
          ['/setup_casino_channel', '-# Set casino channel.'],
          ['/setup_memberlog', '-# Set join/leave log channel.'],
          ['/setup_modlogs', '-# Moderation logs channel.'],
          ['/setup_mute_role', '-# Set mute role.'],
          ['/setup_verify_channel', '-# Set verify channel.'],
          ['/setup_verification_role', '-# Set verification role.'],
          ['/takechips', '-# Remove chips.'],
          ['/timeout', '-# Timeout a user.'],
          ['/unmute', '-# Unmute user.'],
        ],

        public: [
          ['/afk', '-# Set AFK status.'],
          ['/contact', '-# Message bot owner.'],
          ['/help', '-# Open help menu.'],
          ['/memberinfo', '-# Member info.'],
          ['/mc-info', '-# Minecraft server status.'],
          ['/qr', '-# Create QR code.'],
        ],

        fun: [
          ['/ascii', '-# Fun ASCII text.'],
          ['/ping', '-# Bot latency.'],
          ['/whatifyelled', '-# Yelling meme.'],
        ],

        casino: [
          ['/roulette', '-# Roulette game.'],
          ['/slot', '-# Slot machine.'],
          ['/mines', '-# Mines game.'],
        ],
      };

      // NEW MASTER MAPPING (100% FIXES CATEGORY MISMATCH)
      function normalizeCategory(cat) {
        return ({
          Developer: "moderation",
          Moderation: "moderation",
          Public: "public",
          Fun: "fun",
          Economy: "casino",
          moderation: "moderation",
          public: "public",
          fun: "fun",
          casino: "casino"
        })[cat] || null;
      }

      // FIXED SELECT MENU HANDLER
      if (
        interaction.isStringSelectMenu() &&
        (interaction.customId === "help-category" || interaction.customId === "help-menu")
      ) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

        const rawCat = interaction.values[0];
        const category = normalizeCategory(rawCat);

        if (!category || !commandData[category]) {
          return interaction.update({
            content: "❌ Category not found.",
            components: []
          });
        }

        const commands = commandData[category];
        const perPage = 6;
        const page = 0;
        const totalPages = Math.ceil(commands.length / perPage);

        const embed = new EmbedBuilder()
          .setTitle(`📂 ${category} Commands`)
          .setDescription(
            commands.slice(0, perPage).map(([c, d]) => `**${c}**\n${d}`).join("\n\n")
          )
          .setColor("#2C2F33");

        const paginationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`help-${category}-prev-${page}`)
            .setLabel("⬅️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`help-${category}-next-${page + 1}`)
            .setLabel("➡️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalPages <= 1)
        );

        const dropdown = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("help-category")
            .setPlaceholder("📂 Choose a category")
            .addOptions([
              { label: "Moderation", value: "moderation" },
              { label: "Public", value: "public" },
              { label: "Fun", value: "fun" },
              { label: "Casino", value: "casino" }
            ])
        );

        const warnBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("help-warning")
            .setLabel("⚠️ Warning")
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          embeds: [embed],
          components: [dropdown, paginationRow, warnBtn]
        });

        return;
      }

      // FIXED PAGINATION BUTTONS
      if (interaction.isButton() && interaction.customId.startsWith("help-")) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

        const parts = interaction.customId.split("-");
        const category = parts[1];
        const direction = parts[2];
        const page = parseInt(parts[3]);

        const commands = commandData[category];
        if (!commands) return;

        const perPage = 6;
        const totalPages = Math.ceil(commands.length / perPage);

        let newPage = direction === "next" ? page : page - 2;
        if (newPage < 0) newPage = 0;

        const embed = new EmbedBuilder()
          .setTitle(`📂 ${category} Commands — Page ${newPage + 1}`)
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
              { label: "Moderation", value: "moderation" },
              { label: "Public", value: "public" },
              { label: "Fun", value: "fun" },
              { label: "Casino", value: "casino" }
            ])
        );

        const warnBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("help-warning")
            .setLabel("⚠️ Warning")
            .setStyle(ButtonStyle.Danger)
        );

        try {
          await interaction.update({
            embeds: [embed],
            components: [dropdown, paginationRow, warnBtn],
          });
        } catch (err) {
          return;
        }

        return;
      }

      // WARNING BUTTON
      if (interaction.isButton() && interaction.customId === "help-warning") {
        try {
          await interaction.reply({
            content: "⚠️ Gambling is for fun only.",
            ephemeral: true
          });
        } catch {}
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

      // CONTEXT MENU
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
      if (interaction.isModalSubmit() && interaction.customId.startsWith("mute-modal")) {
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
              { name: "From User", value: `<@${interaction.user.id}> (${interaction.user.tag})` },
              { name: "Discord Name", value: discordName },
              { name: "Server Name", value: serverName },
              { name: "Message", value: message }
            );

          await owner.send({ embeds: [embed] });

          await interaction.editReply({
            content: "✅ Your message has been sent.",
          });

        } catch (err) {
          await interaction.editReply({
            content: "❌ Failed to send your message.",
          });
        }

        return;
      }

    } catch (error) {
      console.error(`[ERROR] interactionCreate handler error:`, error);

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({
            content: "❌ An error occurred.",
          });
        } else {
          await interaction.reply({
            content: "❌ An error occurred.",
            ephemeral: true,
          });
        }
      } catch {}
    }
  },
};
