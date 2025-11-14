const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const User = require('../../models/user');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('takechips')
    .setDescription('<:chipsIcon:1395105117237284985> Take chips from a user.')
    .addUserOption(option =>
      option.setName('user').setDescription('User to take chips from').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount of chips to take').setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const { guild, member } = interaction;

    // Check for Moderator permissions (ManageMessages)
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      console.log(`[Permission Denied] ${member.user.tag} tried to use /takechips without permission.`);
      return interaction.reply({
        content: '<:closekIcon:1395099724473700544> You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    // Validate amount
    if (amount <= 0) {
      console.log(`[Invalid Amount] ${member.user.tag} tried to take invalid amount: ${amount}`);
      return interaction.reply({
        content: '<:closekIcon:1395099724473700544> The amount to take must be greater than 0.',
        ephemeral: true,
      });
    }

    // Get user data
    const userData = await User.findOne({ userId: user.id, guildId: guild.id });

    if (!userData) {
      console.log(`[User Not Found] Tried to take chips from ${user.tag}, but no data exists.`);
      return interaction.reply({
        content: '<:closekIcon:1395099724473700544> User data not found.',
        ephemeral: true,
      });
    }

    // Check if user has enough chips
    if (userData.chips < amount) {
      console.log(`[Insufficient Chips] ${user.tag} has only ${userData.chips} chips. ${member.user.tag} tried to take ${amount}.`);
      return interaction.reply({
        content: `<:closekIcon:1395099724473700544> This user does not have enough chips. They only have **${userData.chips}** chips.`,
        ephemeral: true,
      });
    }

    // Deduct chips
    userData.chips -= amount;
    await userData.save();

    console.log(`[Chips Taken] ${member.user.tag} took ${amount} chips from ${user.tag}. Remaining chips: ${userData.chips}`);

    return interaction.reply({
      content: `<:checkIcon:1395099367333167307> You have successfully taken **${amount} chips** from ${user.tag}. They now have **${userData.chips} chips**.`,
    });
  },
};