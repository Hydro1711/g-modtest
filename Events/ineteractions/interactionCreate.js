const { EmbedBuilder } = require("discord.js");
const Poll = require("../../Schemas/poll");

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const [type, action, value] = interaction.customId.split("_");

        if (type !== "poll") return;

        const poll = await Poll.findOne({ messageId: interaction.message.id });
        if (!poll || poll.ended) {
            return interaction.reply({ content: "❌ This poll has ended.", ephemeral: true });
        }

        // ------------------ END POLL ------------------
        if (action === "end") {
            if (!interaction.member.permissions.has("ManageRoles")) {
                return interaction.reply({ content: "❌ Only users with **Manage Roles** can end polls.", ephemeral: true });
            }

            poll.ended = true;
            await poll.save();

            // Count results
            const results = {};
            for (const opt of poll.options) results[opt] = 0;
            for (const [, vote] of poll.votes) {
                results[poll.options[vote]]++;
            }

            let resultText = "";
            for (const [opt, count] of Object.entries(results)) {
                resultText += `**${opt}** — ${count} votes\n`;
            }

            // Create Embed from old embed
            const endedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor("Red")
                .setFooter({ text: "Poll ended" })
                .setDescription(`${poll.question}\n\nResults:\n${resultText}`);

            await interaction.update({
                embeds: [endedEmbed],
                components: []
            });

            return;
        }

        // ------------------ VOTE BUTTON ------------------
        const optionIndex = parseInt(action);
        if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
            return interaction.reply({ content: "❌ Invalid option.", ephemeral: true });
        }

        // Save or overwrite vote
        if (!poll.votes) poll.votes = new Map();
        poll.votes.set(interaction.user.id, optionIndex);
        await poll.save();

        // Count current results
        const results = {};
        for (const opt of poll.options) results[opt] = 0;
        for (const [, vote] of poll.votes) {
            results[poll.options[vote]]++;
        }

        let resultText = "";
        for (const [opt, count] of Object.entries(results)) {
            resultText += `**${opt}** — ${count} votes\n`;
        }

        // Update the embed live
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setDescription(`${poll.question}\n\nResults:\n${resultText}`)
            .setColor("Blue")
            .setFooter({ text: "Poll is ongoing" });

        await interaction.update({
            embeds: [updatedEmbed]
        });

        // Reply privately to the voter
        await interaction.followUp({ content: `✅ You voted for **${poll.options[optionIndex]}**`, ephemeral: true });
    }
};
