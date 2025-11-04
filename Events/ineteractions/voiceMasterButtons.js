const {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");
const VM = require("../../Schemas/voicemaster");
const VcOwner = require("../../Schemas/vcOwner");

const UI = {
  LOCK: "vm_lock",
  UNLOCK: "vm_unlock",
  HIDE: "vm_hide",
  REVEAL: "vm_reveal",
  RENAME: "vm_rename",
  PLUS: "vm_plus",
  MINUS: "vm_minus",
  CLAIM: "vm_claim",
  INFO: "vm_info",
  RENAME_MODAL: "vm_rename_modal",
  RENAME_INPUT: "vm_rename_input",
};

async function resolveContext(interaction) {
  const cfg = await VM.findOne({ guildId: interaction.guild.id });
  if (!cfg) return { error: "VoiceMaster is not configured." };

  // must be in voice channel
  const vc = interaction.member.voice?.channel;
  if (!vc) return { error: "You are not in a voice channel." };

  // channel must be under VM category (and not the JTC itself)
  if (vc.parentId !== cfg.categoryId || vc.id === cfg.joinToCreateChannelId)
    return { error: "You must be in a VoiceMaster-created channel." };

  const ownership = await VcOwner.findOne({ channelId: vc.id });
  return { cfg, vc, ownership };
}

function mustOwn(ownership, interaction) {
  return ownership && ownership.ownerId === interaction.user.id;
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      // BUTTONS
      if (interaction.isButton()) {
        const id = interaction.customId;

        if (!Object.values(UI).includes(id)) return;

        const ctx = await resolveContext(interaction);
        if (ctx.error) return interaction.reply({ content: `❌ ${ctx.error}`, ephemeral: true });

        const { vc, ownership } = ctx;

        // helpers
        const needOwner = async () =>
          interaction.reply({ content: "❌ You don't own this voice channel.", ephemeral: true });

        if (id === UI.LOCK) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
          return interaction.reply({ content: `🔒 Locked <#${vc.id}>`, ephemeral: true });
        }

        if (id === UI.UNLOCK) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
          return interaction.reply({ content: `🔓 Unlocked <#${vc.id}>`, ephemeral: true });
        }

        if (id === UI.HIDE) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
          return interaction.reply({ content: `👻 Hidden <#${vc.id}>`, ephemeral: true });
        }

        if (id === UI.REVEAL) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          await vc.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
          return interaction.reply({ content: `🫥 Revealed <#${vc.id}>`, ephemeral: true });
        }

        if (id === UI.RENAME) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          const modal = new ModalBuilder()
            .setCustomId(UI.RENAME_MODAL)
            .setTitle("Rename your voice channel");
          const input = new TextInputBuilder()
            .setCustomId(UI.RENAME_INPUT)
            .setLabel("New name")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        if (id === UI.PLUS) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          const limit = vc.userLimit || 0;
          if (limit >= 99) return interaction.reply({ content: "⚠️ Limit already max.", ephemeral: true });
          await vc.setUserLimit(limit + 1);
          return interaction.reply({ content: `➕ Limit set to **${limit + 1}**`, ephemeral: true });
        }

        if (id === UI.MINUS) {
          if (!mustOwn(ownership, interaction)) return needOwner();
          const limit = vc.userLimit || 0;
          if (limit <= 0) return interaction.reply({ content: "⚠️ Limit already 0.", ephemeral: true });
          await vc.setUserLimit(limit - 1);
          return interaction.reply({ content: `➖ Limit set to **${limit - 1}**`, ephemeral: true });
        }

        if (id === UI.CLAIM) {
          // allow claim if current owner not present
          const current = ownership ? interaction.guild.members.cache.get(ownership.ownerId) : null;
          if (current && vc.members.has(current.id)) {
            return interaction.reply({ content: "⚠️ The owner is still in the channel.", ephemeral: true });
          }
          await VcOwner.updateOne(
            { channelId: vc.id },
            { $set: { ownerId: interaction.user.id } },
            { upsert: true }
          );
          return interaction.reply({ content: "📥 You are now the owner of this voice channel.", ephemeral: true });
        }

        if (id === UI.INFO) {
          const owner = ownership ? `<@${ownership.ownerId}>` : "Unknown";
          const embed = new EmbedBuilder()
            .setColor(0x4b8bff)
            .setTitle(vc.name)
            .addFields(
              { name: "Owner", value: owner, inline: true },
              { name: "Bitrate", value: `${vc.bitrate / 1000} kbps`, inline: true },
              { name: "Connected", value: `${vc.members.size} member(s)`, inline: true },
            );
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

      // MODAL SUBMIT (rename)
      if (interaction.isModalSubmit() && interaction.customId === UI.RENAME_MODAL) {
        const ctx = await resolveContext(interaction);
        if (ctx.error) return interaction.reply({ content: `❌ ${ctx.error}`, ephemeral: true });

        const { vc, ownership } = ctx;
        if (!ownership || ownership.ownerId !== interaction.user.id)
          return interaction.reply({ content: "❌ You don't own this voice channel.", ephemeral: true });

        const name = interaction.fields.getTextInputValue(UI.RENAME_INPUT).slice(0, 100);
        await vc.setName(name);
        return interaction.reply({ content: `✏️ Renamed to **${name}**`, ephemeral: true });
      }
    } catch (e) {
      console.error("[VoiceMaster] interaction error:", e);
      if (interaction.isRepliable()) {
        try { await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }); } catch {}
      }
    }
  },
};
