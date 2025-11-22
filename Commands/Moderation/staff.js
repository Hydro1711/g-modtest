import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import staffRoles from "../../Schemas/staffRoles.js";
import staffCache from "../../Schemas/staffCache.js";

export const data = new SlashCommandBuilder()
  .setName("staff")
  .setDescription("Show which staff members are online, idle, DND, or offline.");

export async function execute(interaction) {
  try {
    await interaction.deferReply();

    const config = await staffRoles.findOne({ guildId: interaction.guild.id });
    if (!config || !config.roleIds.length) {
      return interaction.editReply("❌ No staff roles have been set.");
    }

    const guild = interaction.guild;

    // Load staff roles (max 10)
    const roles = config.roleIds
      .slice(0, 10)
      .map(id => guild.roles.cache.get(id))
      .filter(Boolean)
      .sort((a, b) => b.position - a.position);

    // Map role → members
    const assigned = new Set();
    const rolesMap = new Map();

    for (const role of roles) {
      const members = role.members.filter(m => !assigned.has(m.id));
      members.forEach(m => assigned.add(m.id));
      if (members.size > 0) rolesMap.set(role, members);
    }

    // Custom statuses
    const statusEmoji = {
      online: "<:Online:1424912330621321256>",
      idle: "<:Idle:1424912473307349043>",
      dnd: "<:Dnd:1424912435747491931>",
      offline: "<:Offline:1424912390960582796>",
    };

    let description = `Staff team.\n\n`;

    for (const [role, members] of rolesMap.entries()) {
      description += `<@&${role.id}>\n`;

      for (const member of members.values()) {
        // 1. fetch presence live (fast)
        const status = member.presence?.status || "offline";

        // 2. check if nickname needs to be updated
        const liveName = member.displayName;

        let cacheEntry = await staffCache.findOne({
          guildId: guild.id,
          memberId: member.id,
        });

        const now = Date.now();
        const expired = !cacheEntry || now - cacheEntry.lastUpdated > 86400000; // 24 hours

        if (!cacheEntry) {
          // create new cache entry
          cacheEntry = await staffCache.create({
            guildId: guild.id,
            memberId: member.id,
            cachedName: liveName,
            lastUpdated: now,
          });
        } else if (expired || cacheEntry.cachedName !== liveName) {
          // refresh outdated or changed name
          cacheEntry.cachedName = liveName;
          cacheEntry.lastUpdated = now;
          await cacheEntry.save();
        }

        const name = cacheEntry.cachedName;

        description += `${statusEmoji[status] ?? statusEmoji.offline} *${name}*\n`;
      }

      description += "\n";
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${guild.name} Staff`)
      .setColor(0x2b2d31)
      .setDescription(description)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error("❌ STAFF CMD ERROR:", err);

    if (interaction.deferred) {
      return interaction.editReply("❌ An error occurred.");
    }
  }
}
