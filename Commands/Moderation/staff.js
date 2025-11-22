import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import staffRoles from "../../Schemas/staffRoles.js";

export const data = new SlashCommandBuilder()
  .setName("staff")
  .setDescription("Show which staff members are online, idle, DND, or offline.");

export async function execute(interaction) {
  console.log("🔹 Slash command triggered: /staff");
  console.log("🔹 User:", interaction.user.tag);
  console.log("🔹 Guild:", interaction.guild?.name);

  try {
    // VERY IMPORTANT: Defer immediately to avoid "Unknown Interaction"
    await interaction.deferReply();

    // Fetch roles from DB
    const config = await staffRoles.findOne({ guildId: interaction.guild.id });
    if (!config || !config.roleIds.length) {
      return interaction.editReply({
        content: "❌ No staff roles set up. Use `/stafflist` to add staff roles.",
      });
    }

    // Fetch all members with presences (can take long on large guilds)
    await interaction.guild.members.fetch({ withPresences: true });

    // Sort roles top → bottom
    const roles = config.roleIds
      .slice(0, 10) // support up to 10 staff roles
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .sort((a, b) => b.position - a.position);

    const assignedMembers = new Set();
    const rolesMap = new Map();

    for (const role of roles) {
      const members = role.members.filter(m => !assignedMembers.has(m.id));
      members.forEach(m => assignedMembers.add(m.id));
      if (members.size > 0) rolesMap.set(role, members);
    }

    // Custom emoji set (your IDs)
    const statusEmojis = {
      online: "<:Online:1424912330621321256>",
      idle: "<:Idle:1424912473307349043>",
      dnd: "<:Dnd:1424912435747491931>",
      offline: "<:Offline:1424912390960582796>",
    };

    // Build embed description
    let description = `Staff team.\n\n`;

    for (const [role, members] of rolesMap) {
      description += `<@&${role.id}>\n`;

      const sortedMembers = members.sort(
        (a, b) => b.roles.highest.position - a.roles.highest.position
      );

      sortedMembers.forEach(member => {
        const status = member.presence?.status || "offline";
        const emoji = statusEmojis[status] ?? statusEmojis.offline;

        description += `${emoji} ${member}\n`;
      });

      description += "\n";
    }

    description += `Requested by ${interaction.user}`;

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(`📋 ${interaction.guild.name} Staff`)
      .setColor(0x2b2d31)
      .setDescription(description)
      .setTimestamp();

    // Send response
    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error("[ERROR] /staff command failed:", err);

    if (interaction.deferred) {
      return interaction.editReply({
        content: "❌ An error occurred while executing the command.",
      });
    }

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ An error occurred.",
        ephemeral: true,
      });
    }
  }
}

