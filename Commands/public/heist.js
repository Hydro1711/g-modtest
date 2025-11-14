const {
  SlashCommandBuilder,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const User = require("../../models/user");

const HEIST_COOLDOWN = 30 * 60 * 1000; // 30 minutes
const JAIL_TIME = 45 * 60 * 1000;      // 45 minutes
const MIN_CHIPS_REQUIRED = 500;        // must have at least this to attempt

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!hours && !minutes && seconds) parts.push(`${seconds}s`);
  return parts.join(" ") || "a moment";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("heist")
    .setDescription("Start a heist lobby where players can join via buttons."),

  async execute(interaction) {
    const leaderId = interaction.user.id;
    const now = Date.now();

    try {
      // fetch or create leader user
      let leaderUser = await User.findOne({ userId: leaderId });
      if (!leaderUser) {
        leaderUser = await User.create({ userId: leaderId, chips: 0 });
      }

      // jail check
      if (leaderUser.jailUntil && leaderUser.jailUntil.getTime() > now) {
        const remaining = leaderUser.jailUntil.getTime() - now;
        return interaction.reply({
          content: `🚔 You are still in prison. You can’t start a heist for **${formatDuration(remaining)}**.`,
          ephemeral: true,
        });
      }

      // cooldown check
      if (leaderUser.lastHeist) {
        const diff = now - leaderUser.lastHeist.getTime();
        if (diff < HEIST_COOLDOWN) {
          const remaining = HEIST_COOLDOWN - diff;
          return interaction.reply({
            content: `⏳ You recently attempted a heist. Try again in **${formatDuration(remaining)}**.`,
            ephemeral: true,
          });
        }
      }

      if ((leaderUser.chips || 0) < MIN_CHIPS_REQUIRED) {
        return interaction.reply({
          content: `💸 You need at least **${MIN_CHIPS_REQUIRED} chips** to fund a heist.`,
          ephemeral: true,
        });
      }

      // --- Heist Lobby Setup ---

      // Map of userId -> { userId, tag }
      const participants = new Map();
      participants.set(leaderId, {
        userId: leaderId,
        tag: interaction.user.tag,
      });

      const lobbyId = interaction.id; // unique per interaction

      const joinId = `heist-join-${lobbyId}`;
      const leaveId = `heist-leave-${lobbyId}`;
      const startId = `heist-start-${lobbyId}`;

      const makeDescription = () => {
        if (!participants.size) return "No one has joined the crew yet.";
        const lines = [];
        for (const p of participants.values()) {
          lines.push(`• <@${p.userId}> (${p.tag})`);
        }
        return lines.join("\n");
      };

      const lobbyEmbed = new EmbedBuilder()
        .setColor(Colors.Yellow)
        .setTitle("💣 Heist Lobby")
        .setDescription(
          [
            "A heist is being planned!",
            "",
            `Leader: <@${leaderId}>`,
            "",
            "**Crew Members:**",
            makeDescription(),
            "",
            "Press **Join Heist** to join the crew.",
            "The leader can start the heist early, otherwise it will auto-start when the timer ends.",
          ].join("\n")
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(joinId)
          .setLabel("Join Heist")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(leaveId)
          .setLabel("Leave Heist")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(startId)
          .setLabel("Start Heist")
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.reply({
        embeds: [lobbyEmbed],
        components: [row],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 45_000, // 45 seconds lobby
      });

      let heistStarted = false;

      collector.on("collect", async (i) => {
        // only buttons from this message
        if (i.message.id !== msg.id) return;

        const userId = i.user.id;
        const nowInner = Date.now();

        // join button
        if (i.customId === joinId) {
          // Load or create user
          let userDoc = await User.findOne({ userId });
          if (!userDoc) {
            userDoc = await User.create({ userId, chips: 0 });
          }

          // jail check
          if (userDoc.jailUntil && userDoc.jailUntil.getTime() > nowInner) {
            const remaining = userDoc.jailUntil.getTime() - nowInner;
            return i.reply({
              content: `🚔 You are in prison. You can’t join a heist for **${formatDuration(remaining)}**.`,
              ephemeral: true,
            });
          }

          // cooldown check
          if (userDoc.lastHeist) {
            const diff = nowInner - userDoc.lastHeist.getTime();
            if (diff < HEIST_COOLDOWN) {
              const remaining = HEIST_COOLDOWN - diff;
              return i.reply({
                content: `⏳ You recently attempted a heist. Try again in **${formatDuration(remaining)}**.`,
                ephemeral: true,
              });
            }
          }

          if ((userDoc.chips || 0) < MIN_CHIPS_REQUIRED) {
            return i.reply({
              content: `💸 You need at least **${MIN_CHIPS_REQUIRED} chips** to join this heist.`,
              ephemeral: true,
            });
          }

          if (participants.has(userId)) {
            return i.reply({
              content: "❗ You are already in the crew.",
              ephemeral: true,
            });
          }

          participants.set(userId, {
            userId,
            tag: i.user.tag,
          });

          const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
            .setDescription(
              [
                "A heist is being planned!",
                "",
                `Leader: <@${leaderId}>`,
                "",
                "**Crew Members:**",
                makeDescription(),
                "",
                "Press **Join Heist** to join the crew.",
                "The leader can start the heist early, otherwise it will auto-start when the timer ends.",
              ].join("\n")
            );

          await i.update({
            embeds: [updatedEmbed],
            components: [row],
          });
          return;
        }

        // leave button
        if (i.customId === leaveId) {
          if (!participants.has(userId)) {
            return i.reply({
              content: "❗ You are not part of this heist crew.",
              ephemeral: true,
            });
          }

          // Leader leaving cancels the whole heist
          if (userId === leaderId) {
            participants.clear();
            heistStarted = false;
            collector.stop("leader-left");
            await i.update({
              embeds: [
                EmbedBuilder.from(lobbyEmbed)
                  .setColor(Colors.Red)
                  .setTitle("❌ Heist Cancelled")
                  .setDescription("The leader left the lobby. The heist has been cancelled.")
              ],
              components: [],
            });
            return;
          }

          participants.delete(userId);

          const updatedEmbed = EmbedBuilder.from(lobbyEmbed)
            .setDescription(
              [
                "A heist is being planned!",
                "",
                `Leader: <@${leaderId}>`,
                "",
                "**Crew Members:**",
                makeDescription(),
                "",
                "Press **Join Heist** to join the crew.",
                "The leader can start the heist early, otherwise it will auto-start when the timer ends.",
              ].join("\n")
            );

          await i.update({
            embeds: [updatedEmbed],
            components: [row],
          });
          return;
        }

        // start button
        if (i.customId === startId) {
          if (userId !== leaderId) {
            return i.reply({
              content: "❌ Only the heist leader can start the heist.",
              ephemeral: true,
            });
          }

          if (participants.size === 0) {
            return i.reply({
              content: "❌ You can't start a heist without any crew members.",
              ephemeral: true,
            });
          }

          heistStarted = true;
          await i.deferUpdate();
          collector.stop("started");
        }
      });

      collector.on("end", async (_collected, reason) => {
        // disable buttons no matter what
        const disabledRow = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(row.components[0]).setDisabled(true),
          ButtonBuilder.from(row.components[1]).setDisabled(true),
          ButtonBuilder.from(row.components[2]).setDisabled(true)
        );

        if (!heistStarted) {
          // auto-start if there is at least 1 participant, otherwise cancel
          if (participants.size === 0) {
            await msg.edit({
              embeds: [
                EmbedBuilder.from(lobbyEmbed)
                  .setColor(Colors.Red)
                  .setTitle("❌ Heist Cancelled")
                  .setDescription("No one joined the crew in time. The heist was cancelled."),
              ],
              components: [disabledRow],
            }).catch(() => {});
            return;
          }

          // start automatically
          heistStarted = true;
          reason = "started";
        }

        if (reason !== "started") {
          // some other stop reason (leader-left handled earlier)
          return;
        }

        // --- Run the heist logic for all participants ---

        const nowHeist = Date.now();
        const memberIds = [...participants.keys()];
        const teamSize = memberIds.length;

        // success chance scales with team size, capped
        // base 25% + 10% per extra member up to 65%
        let successChance = 0.25 + 0.1 * (teamSize - 1);
        if (successChance > 0.65) successChance = 0.65;

        const roll = Math.random(); // 0–1

        try {
          const users = await User.find({ userId: { $in: memberIds } });

          const userMap = new Map();
          for (const u of users) {
            userMap.set(u.userId, u);
          }

          // ensure all exist
          for (const id of memberIds) {
            if (!userMap.has(id)) {
              const newUser = await User.create({ userId: id, chips: 0 });
              userMap.set(id, newUser);
            }
          }

          let resultEmbed;

          if (roll < successChance) {
            // SUCCESS
            const baseMin = 3000;
            const baseMax = 10000;
            // scale total reward by team size
            const totalReward =
              Math.floor(Math.random() * (baseMax - baseMin + 1)) +
              baseMin +
              (teamSize - 1) * 500; // extra per member

            const rewardPer = Math.max(200, Math.floor(totalReward / teamSize));
            const lines = [];

            for (const id of memberIds) {
              const u = userMap.get(id);
              u.chips = (u.chips || 0) + rewardPer;
              u.lastHeist = new Date(nowHeist);
              u.jailUntil = null;
              await u.save();

              lines.push(`• <@${id}> gained **${rewardPer.toLocaleString()}** chips (Total: ${u.chips.toLocaleString()})`);
            }

            resultEmbed = new EmbedBuilder()
              .setColor(Colors.Green)
              .setTitle("💰 Heist Successful!")
              .setDescription(
                [
                  `The crew pulled off a **successful heist** with ${teamSize} members!`,
                  `Total loot: **${(rewardPer * teamSize).toLocaleString()} chips**.`,
                  "",
                  "**Crew Payouts:**",
                  ...lines,
                ].join("\n")
              )
              .setTimestamp();
          } else {
            // FAIL
            const lines = [];

            for (const id of memberIds) {
              const u = userMap.get(id);
              const before = u.chips || 0;
              const loss = Math.floor(before * (Math.random() * 0.4 + 0.15)); // 15–55% loss
              const final = Math.max(0, before - loss);

              u.chips = final;
              u.lastHeist = new Date(nowHeist);
              u.jailUntil = new Date(nowHeist + JAIL_TIME);
              await u.save();

              lines.push(
                `• <@${id}> lost **${loss.toLocaleString()}** chips (Now: ${u.chips.toLocaleString()}) and is jailed for **${formatDuration(JAIL_TIME)}**`
              );
            }

            resultEmbed = new EmbedBuilder()
              .setColor(Colors.Red)
              .setTitle("🚔 Heist Failed – The Cops Caught the Crew")
              .setDescription(
                [
                  `The heist went wrong and the entire crew was arrested.`,
                  "",
                  ...lines,
                ].join("\n")
              )
              .setTimestamp();
          }

          await msg.edit({
            embeds: [resultEmbed],
            components: [disabledRow],
          }).catch(() => {});
        } catch (err) {
          console.error("Error resolving team heist:", err);
          await msg.edit({
            content: "❌ An error occurred while resolving the heist.",
            embeds: [],
            components: [disabledRow],
          }).catch(() => {});
        }
      });
    } catch (err) {
      console.error("Error in /heist:", err);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "❌ Error while setting up the heist.",
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ Error while setting up the heist.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
