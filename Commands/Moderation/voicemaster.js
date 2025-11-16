const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const VoiceMasterConfig = require("../../Schemas/voicemaster");
const VcOwner = require("../../Schemas/vcOwner");

function buildInterfaceEmbed(guild) {
  return new EmbedBuilder()
    .setColor(0x00aaff)
    .setAuthor({
      name: `${guild.name} • VoiceMaster Interface`,
      iconURL: guild.iconURL({ dynamic: true }),
    })
.setDescription(`
<:Pretend_Info:1218594218050715669> **Welcome to the VoiceMaster Control Panel**

Manage your **temporary voice channels** using the buttons below.  
> 💡 *You must be inside your own VoiceMaster-created VC to use these.*

**<:Pretend_Lock:1278521238775660675> Lock / <:Pretend_Unlock:1218592726388441180> Unlock**  
• Prevent or allow members joining your VC.

**<:Pretend_VcHide:1278520818657267735> Hide / <:Pretend_channel:1278517705561079921> Reveal**  
• Make your voice channel hidden or visible.

**<:Pretend_Speech:1218593768954138675> Rename**  
• Instantly rename your voice channel.

**<:Pretend_plus:1278516999151943691> / <:Pretend_minus:1278517000423079936> User Limit**  
• Adjust how many people can join (up to 99).

**<:Pretend_claim:1278516997482610738> Claim Ownership**  
• Take ownership if the previous owner left.

**<:Pretend_Info:1218594218050715669> Info**  
• Shows bitrate, members, and creation time.
`)

    .setFooter({
      text: "M-Guard VoiceMaster System • Premium Experience",
      iconURL: guild.iconURL({ dynamic: true }),
    })
    .setTimestamp();
}

function buildInterfaceButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("vm_lock")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Pretend_Lock:1278521238775660675>"),
      new ButtonBuilder()
        .setCustomId("vm_unlock")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Pretend_Unlock:1218592726388441180>"),
      new ButtonBuilder()
        .setCustomId("vm_hide")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Pretend_VcHide:1278520818657267735>"),
      // ✅ Reveal should use Pretend_channel
      new ButtonBuilder()
        .setCustomId("vm_reveal")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Pretend_channel:1278517705561079921>"),
      // ✅ Rename should use Pretend_Speech
      new ButtonBuilder()
        .setCustomId("vm_rename")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("<:Pretend_Speech:1218593768954138675>")
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("vm_plus")
        .setStyle(ButtonStyle.Success)
        .setEmoji("<:Pretend_plus:1278516999151943691>"),
      new ButtonBuilder()
        .setCustomId("vm_minus")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<:Pretend_minus:1278517000423079936>"),
      new ButtonBuilder()
        .setCustomId("vm_claim")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Pretend_claim:1278516997482610738>"),
      new ButtonBuilder()
        .setCustomId("vm_info")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:Pretend_Info:1218594218050715669>")
    ),
  ];
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName("voicemaster")
    .setDescription("VoiceMaster setup and management system")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("setup").setDescription("Set up VoiceMaster system for your server")
    )
    .addSubcommand(sub =>
      sub.setName("remove").setDescription("Remove VoiceMaster system from your server")
    )
    .addSubcommand(sub =>
      sub.setName("interface").setDescription("Resend the VoiceMaster control panel")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "setup") {
      let existing = await VoiceMasterConfig.findOne({ guildId: guild.id });
      if (existing)
        return interaction.reply({
          content: "⚠️ VoiceMaster is already configured here.",
          ephemeral: true,
        });

      const category = await guild.channels.create({
        name: "🎙️ Voice Channels",
        type: ChannelType.GuildCategory,
      });

      const interfaceChannel = await guild.channels.create({
        name: "interface",
        type: ChannelType.GuildText,
        parent: category.id,
      });

      const joinToCreate = await guild.channels.create({
        name: "Join to Create",
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      await VoiceMasterConfig.create({
        guildId: guild.id,
        joinToCreateChannelId: joinToCreate.id,
        interfaceChannelId: interfaceChannel.id,
        categoryId: category.id,
      });

      await interfaceChannel.send({
        embeds: [buildInterfaceEmbed(guild)],
        components: buildInterfaceButtons(),
      });

      return interaction.reply({
        content: "✅ VoiceMaster has been configured successfully.",
        ephemeral: true,
      });
    }

    if (sub === "remove") {
      const config = await VoiceMasterConfig.findOne({ guildId: guild.id });
      if (!config)
        return interaction.reply({
          content: "❌ VoiceMaster is not configured here.",
          ephemeral: true,
        });

      const category = guild.channels.cache.get(config.categoryId);
      if (category) {
        for (const channel of category.children.cache.values()) {
          try {
            await channel.delete();
          } catch {}
        }
        await category.delete().catch(() => {});
      }

      await VoiceMasterConfig.deleteOne({ guildId: guild.id });
      return interaction.reply({
        content: "🧹 VoiceMaster has been removed.",
        ephemeral: true,
      });
    }

    if (sub === "interface") {
      const config = await VoiceMasterConfig.findOne({ guildId: guild.id });
      if (!config)
        return interaction.reply({
          content: "❌ Not configured. Run `/voicemaster setup` first.",
          ephemeral: true,
        });

      const channel = guild.channels.cache.get(config.interfaceChannelId);
      if (!channel)
        return interaction.reply({
          content: "⚠️ Interface channel missing. Try `/voicemaster setup` again.",
          ephemeral: true,
        });

      await channel.send({
        embeds: [buildInterfaceEmbed(guild)],
        components: buildInterfaceButtons(),
      });

      return interaction.reply({
        content: "✅ Sent a new VoiceMaster interface panel.",
        ephemeral: true,
      });
    }
  },
};

