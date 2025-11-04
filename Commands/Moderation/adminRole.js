// Commands/Developer/admin-role.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json'); // { "DeveloperID": "YOUR_ID" }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-role')
    .setDescription('Add or remove a role from a user (Developer only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Give a role to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to give the role to')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to assign')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove the role from')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // ✅ Restrict to Developer only
    if (interaction.user.id !== config.DeveloperID) {
      return interaction.reply({
        content: '❌ Only the Developer can use this command.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!user) {
      return interaction.reply({ content: '❌ That user is no longer in the server.', ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ I don’t have permission to manage roles.', ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: '❌ That role is higher than my highest role.', ephemeral: true });
    }

    try {
      if (subcommand === 'add') {
        if (user.roles.cache.has(role.id)) {
          return interaction.reply({ content: '⚠️ That user already has this role.', ephemeral: true });
        }

        await user.roles.add(role);

        const dmEmbed = new EmbedBuilder()
          .setTitle('🎉 You Received a Role')
          .setDescription(`You have been given the ${role} role in **${interaction.guild.name}**.`)
          .setColor('Green');

        await user.send({ embeds: [dmEmbed] }).catch(() => {});

        const confirmEmbed = new EmbedBuilder()
          .setTitle('✅ Role Given')
          .setDescription(`${role} has been given to ${user}.`)
          .setColor('Green');

        return interaction.reply({ embeds: [confirmEmbed] });
      }

      if (subcommand === 'remove') {
        if (!user.roles.cache.has(role.id)) {
          return interaction.reply({ content: '⚠️ That user doesn’t have this role.', ephemeral: true });
        }

        await user.roles.remove(role);

        const dmEmbed = new EmbedBuilder()
          .setTitle('⚠️ Role Removed')
          .setDescription(`The ${role} role has been removed from you in **${interaction.guild.name}**.`)
          .setColor('Red');

        await user.send({ embeds: [dmEmbed] }).catch(() => {});

        const confirmEmbed = new EmbedBuilder()
          .setTitle('✅ Role Removed')
          .setDescription(`${role} has been removed from ${user}.`)
          .setColor('Red');

        return interaction.reply({ embeds: [confirmEmbed] });
      }
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: '❌ Something went wrong while managing the role.', ephemeral: true });
    }
  }
};
