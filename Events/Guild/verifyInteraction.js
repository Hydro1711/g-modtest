const {
  Client,
  CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const roleSchema = require("../../Schemas/verifyRoleId");
const randomString = require("randomstring");

module.exports = {
  name: "interactionCreate",

  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  async execute(interaction, client) {
    // Slash command: setup
    if (interaction.isChatInputCommand() && interaction.commandName === "setup") {
      const channel = interaction.options.getChannel("channel");

      const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${interaction.guild.name}!`)
        .setDescription("Click the button below to verify yourself. You'll then get access to the server.")
        .setColor("Navy");

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verifyMember")
          .setLabel("Verify")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✅")
      );

      try {
        await channel.send({ embeds: [embed], components: [button] });

        if (!interaction.replied) {
          await interaction.reply({
            content: `✅ Verification message has been sent in ${channel}`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error("Error while sending message:", error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ There was a problem sending the verification message.",
            ephemeral: true,
          });
        }
      }
    }

    // Button press: verifyMember
    if (interaction.isButton() && interaction.customId === "verifyMember") {
      try {
        const verifyRoleData = await roleSchema.findOne({ guildId: interaction.guild.id });

        if (!verifyRoleData) {
          return await interaction.reply({
            content: "❌ No verification role is set for this server. Use `/setrole`.",
            ephemeral: true,
          });
        }

        if (interaction.member.roles.cache.has(verifyRoleData.roleId)) {
          return await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("✅ You are already verified!")
                .setColor("Blue"),
            ],
            ephemeral: true,
          });
        }

        const randomToken = randomString.generate({ length: 5, charset: "hex" }).toUpperCase();

        const modal = new ModalBuilder()
          .setCustomId("verifyUserModal")
          .setTitle(`Verification code: ${randomToken}`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("veryUserInput")
                .setLabel("Verification code in title:")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(5)
            )
          );

        await interaction.showModal(modal);

        // Wait for the user to submit the modal
        const modalSubmitInt = await interaction.awaitModalSubmit({
          filter: (i) => i.customId === "verifyUserModal" && i.user.id === interaction.user.id,
          time: 600000, // 10 minutes
        });

        const inputCode = modalSubmitInt.fields.getTextInputValue("veryUserInput").toUpperCase();
        const verifyRole = interaction.guild.roles.cache.get(verifyRoleData.roleId);

        if (!verifyRole) {
          if (!modalSubmitInt.replied && !modalSubmitInt.deferred) {
            await modalSubmitInt.reply({
              content: "❌ The verification role no longer exists!",
              ephemeral: true,
            });
          }
          return;
        }

        if (inputCode === randomToken) {
          await interaction.member.roles.add(verifyRole);
          if (!modalSubmitInt.replied && !modalSubmitInt.deferred) {
            await modalSubmitInt.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("✅ Verification Successful!")
                  .setDescription(`You have been given the role ${verifyRole.name}!`)
                  .setColor("Green"),
              ],
              ephemeral: true,
            });
          }
        } else {
          if (!modalSubmitInt.replied && !modalSubmitInt.deferred) {
            await modalSubmitInt.reply({
              content: "❌ Incorrect code entered.",
              ephemeral: true,
            });
          }
        }
      } catch (err) {
        console.error("Verification flow error:", err);
        // No need to reply here since interaction may be expired
      }
    }
  },
};
