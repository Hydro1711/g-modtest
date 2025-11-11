const { GuildMember, EmbedBuilder } = require("discord.js");
const moment = require("moment");
const MutedList = require("../../Schemas/mutedList");
const MutedRoleDB = require("../../Schemas/muteRole"); // per-server mute role
const Blacklist = require("../../Schemas/blacklist");

module.exports = {
  name: "guildMemberAdd",
  /**
   * @param {GuildMember} member 
   */
  async execute(member, client) {
    console.log(`[GUILD_MEMBER_ADD] ${member.user.tag} joined ${member.guild.name}`);

    const guildConfig = client.guildConfig.get(member.guild.id);
    if (!guildConfig) {
      console.log(`[GUILD_MEMBER_ADD] No guild config found for ${member.guild.id}`);
      return;
    }

    // --- BLACKLIST AUTO-BAN ---
    try {
      console.log(`[BLACKLIST] Checking if ${member.user.tag} is blacklisted...`);
      const blacklisted = await Blacklist.findOne({ userId: member.id });
      if (blacklisted) {
        console.log(`[BLACKLIST] ${member.user.tag} is blacklisted: ${JSON.stringify(blacklisted)}`);
        if (!member.guild.members.me.permissions.has("BanMembers")) {
          console.log(`[BLACKLIST] Missing BanMembers permission, cannot ban ${member.user.tag}`);
          return;
        }
        await member.ban({ reason: `Blacklisted user auto-banned on join: ${blacklisted.reason}` });
        console.log(`[BLACKLIST] Banned blacklisted user ${member.user.tag}`);
        return;
      } else {
        console.log(`[BLACKLIST] ${member.user.tag} is not blacklisted`);
      }
    } catch (err) {
      console.error(`[BLACKLIST] Error checking blacklist for ${member.user.tag}:`, err);
    }

    // --- MUTE ROLE RESTORE ---
    try {
      console.log(`[MUTE_REJOIN] Checking muted list for ${member.user.tag}...`);
      const mutedEntry = await MutedList.findOne({ guildId: member.guild.id, userId: member.id });
      if (!mutedEntry) {
        console.log(`[MUTE_REJOIN] No muted entry found for ${member.user.tag}`);
      } else {
        console.log(`[MUTE_REJOIN] Found muted entry: ${JSON.stringify(mutedEntry)}`);

        // Remove expired mute
        if (mutedEntry.expiresAt && Date.now() > mutedEntry.expiresAt) {
          await MutedList.deleteOne({ guildId: member.guild.id, userId: member.id });
          console.log(`[MUTE_REJOIN] ${member.user.tag}'s mute expired — removed from DB.`);
        } else {
          // Get mute role from guild's MutedRole schema
          const muteData = await MutedRoleDB.findOne({ Guild: member.guild.id });
          if (!muteData || !muteData.RoleID) {
            console.warn(`[MUTE_REJOIN] No mute role configured for guild ${member.guild.name}`);
          } else {
            const muteRole = member.guild.roles.cache.get(muteData.RoleID);
            if (!muteRole) {
              console.warn(`[MUTE_REJOIN] Mute role with ID ${muteData.RoleID} not found in guild`);
            } else if (member.roles.cache.has(muteRole.id)) {
              console.log(`[MUTE_REJOIN] ${member.user.tag} already has the mute role`);
            } else {
              console.log(`[MUTE_REJOIN] Adding mute role ${muteRole.name} to ${member.user.tag}`);
              await member.roles.add(muteRole).catch(err =>
                console.error(`[MUTE_REJOIN] Failed to add mute role:`, err)
              );
            }
          }
        }
      }
    } catch (err) {
      console.error(`[MUTE_REJOIN] Failed to restore mute for ${member.user.tag}:`, err);
    }

    // --- DEFAULT ROLE ASSIGNMENT ---
    const guildRoles = member.guild.roles.cache;
    let assignedRole = member.user.bot
      ? guildRoles.get(guildConfig.botRole)
      : guildRoles.get(guildConfig.memberRole);

    if (!assignedRole) assignedRole = "Not configured.";
    else {
      await member.roles.add(assignedRole).catch(err => {
        console.error(`[DEFAULT_ROLE] Failed to add default role to ${member.user.tag}:`, err);
        assignedRole = "failed due to role hierarchy";
      });
    }

    // --- JOIN LOG ---
    const logChannel = (await member.guild.channels.fetch()).get(guildConfig.logChannel);
    if (!logChannel || !logChannel.permissionsFor(client.user).has("SendMessages")) {
      console.warn(`[JOIN_LOG] Cannot send join log for ${member.user.tag}`);
      return;
    }

    const accountCreation = parseInt(member.user.createdTimestamp / 1000);
    const joiningTime = parseInt(member.joinedAt / 1000);

    let color = "#74e21e", risk = "Fairly safe";
    const monthsAgo = moment().subtract(2, "months").unix();
    const weeksAgo = moment().subtract(2, "weeks").unix();
    const daysAgo = moment().subtract(2, "days").unix();
    if (accountCreation >= monthsAgo) { color = "#e2bb1e"; risk = "Medium"; }
    if (accountCreation >= weeksAgo) { color = "#e24d1e"; risk = "High"; }
    if (accountCreation >= daysAgo) { color = "#e21e1e"; risk = "Extreme"; }

    const roleName = assignedRole?.name || assignedRole;
    const Embed = new EmbedBuilder()
      .setAuthor({ name: `${member.user.tag} | ${member.user.bot ? "Bot" : "User"}`, iconURL: member.displayAvatarURL({ dynamic: true }) })
      .setColor(color)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription([
        `• User: ${member.user}`,
        `• Account Type: ${member.user.bot ? "Bot" : "User"}`,
        `• Role Assigned: ${roleName}`,
        `• Risk level: ${risk}`,
        `• Account Created: <t:${accountCreation}:D> | <t:${accountCreation}:R>`,
        `• Account Joined: <t:${joiningTime}:D> | <t:${joiningTime}:R>`
      ].join("\n"))
      .setFooter({ text: "Joined" })
      .setTimestamp();

    console.log(`[JOIN_LOG] Sent join embed for ${member.user.tag}`);
    return logChannel.send({ embeds: [Embed] });
  },
};
