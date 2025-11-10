const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Display info about a member.")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("Select a user.")
        .setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("target") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setColor("Blue")
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "User ID", value: user.id, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );

    if (member) {
      embed.addFields(
        { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: "Highest Role", value: `${member.roles.highest}`, inline: true },
        { name: "Roles", value: member.roles.cache.map(r => r).slice(0, 10).join(" ") || "None" }
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
