const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  developer: true,
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reload your commands/events.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((options) =>
      options.setName("events").setDescription("reload your events.")
    )
    .addSubcommand((options) =>
      options.setName("commands").setDescription("reload your commands.")
    ),

  async execute(interaction, client) {
    const subCommand = interaction.options.getSubcommand();
    console.log(`[Reload] User ${interaction.user.tag} triggered reload ${subCommand}`);

    if (subCommand === "commands") {
      const commandsReload = require("./commands");
      await commandsReload.execute(interaction, client);
    } else if (subCommand === "events") {
      const eventsReload = require("./events");
      await eventsReload.execute(interaction, client);
    } else {
      console.log(`[Reload] Unknown subcommand: ${subCommand}`);
      await interaction.reply({
        content: "Unknown subcommand.",
        ephemeral: true,
      });
    }
  },
};
