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
    const config = await staffRoles.findOne({ guildId: interaction.guild.id });
    if (!config || !config.roleIds.length)
      return interaction.reply({
        content: "❌ No staff roles set up. Use `/setup-staff-members` first.",
        ephemeral: true,
      });

    await interaction.deferReply();

    // Fetch members with presences
    await interaction.guild.members.fetch({ withPresences: true });
    console.log(`✅ Members fetched: ${interaction.guild.members.cache.size}`);

    // Get all roles sorted by hierarchy (highest first)
    const roles = config.roleIds
      .map((id) => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .sort((a, b) => b.position - a.position);

    // Map role -> members, only assign member to their highest role
    const assignedMembers = new Set();
    const rolesMap = new Map();

    for (const role of roles) {
      const members = role.members.filter((m) => !assignedMembers.has(m.id));
      members.forEach((m) => assignedMembers.add(m.id));
      if (members.size > 0) rolesMap.set(role, members);
    }

    // Build description
    let description = `Staff team.\n\n`;

    for (const [role, members] of rolesMap) {
      description += `<@&${role.id}>\n`; // clickable role

      const sortedMembers = members.sort(
        (a, b) => b.roles.highest.position - a.roles.highest.position
      );

      sortedMembers.forEach((m) => {
        const status = m.presence?.status || "offline";

        // ⭐ Updated emojis here ⭐
        let emoji;
        switch (status) {
          case "online":
            emoji = "<:Online:1424912330621321256>";
            break;
          case "idle":
            emoji = "<:Idle:1424912473307349043>";
            break;
          case "dnd":
            emoji = "<:Dnd:1424912435747491931>";
            break;
          default:
            emoji = "<:Offline:1424912390960582796>";
        }

        description += `${emoji} ${m}\n`;
      });

      description += "\n";
    }

    description += `Requested by ${interaction.user}`;

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${interaction.guild.name} Staff`)
      .setColor(0x2b2d31)
      .setDescription(description)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    console.log("✅ Staff embed sent successfully.");
  } catch (err) {
    console.error("[ERROR] /staff command failed:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ An error occurred while executing the command.",
        ephemeral: true,
      });
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: "❌ An error occurred while executing the command.",
      });
    }
  }
}
