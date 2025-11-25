const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json'); // adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingspam')
    .setDescription('Spam insults to a user (Developer/Tester + Admin only).')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The user to spam insults')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('How many insults to send (default: 25)')
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    console.log("=== /pingspam command triggered ===");
    console.log("Executor ID:", interaction.user.id);
    console.log("Executor tag:", interaction.user.tag);
    console.log("Guild ID:", interaction.guild?.id);
    console.log("Guild name:", interaction.guild?.name);
    console.log("Config DeveloperID:", config.DeveloperID);
    console.log("Config TesterID:", config.TesterID);

    const isDeveloper = interaction.user.id === config.DeveloperID;
    const isTester = Array.isArray(config.TesterID) && config.TesterID.includes(interaction.user.id);
    const hasAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    console.log("isDeveloper:", isDeveloper);
    console.log("isTester:", isTester);
    console.log("hasAdmin:", hasAdmin);

    // Must be (Developer OR Tester) AND Admin
    if ((!isDeveloper && !isTester) || !hasAdmin) {
      console.warn("❌ Permission check failed.");
      return interaction.reply({
        content: '❌ You must be the **Developer or Tester** AND have **Administrator** rights to use this command.',
        ephemeral: true
      });
    }

    console.log("✅ Permission check passed.");

    const user = interaction.options.getUser('target');
    console.log("Target user:", user?.id, user?.tag);

    // NEW: amount option
    const amount = interaction.options.getInteger('amount') ?? 25;
    console.log("Amount selected:", amount);

    const insults = [
      "ur unemployed fatass is the reason we pay extra taxes",
      "It’s amazing how consistently you manage to disappoint.",
      "You’re nothing but a walking embarrassment.",
      "Honestly, your existence is a joke.",
      "You have the personality of a damp rag.",
      "Nobody asked for your opinion, moron.",
      "You bring ignorance to a whole new level.",
      "You’re the human equivalent of a migraine.",
      "If stupidity was a crime, you’d be serving a life sentence.",
      "You’re so dense, light bends around you.",
      "You’re an absolute disgrace to your species.",
      "Your brain must be made of cotton candy.",
      "You have the charisma of a dead fish.",
      "You’re so useless, you couldn’t pour water out of a boot.",
      "Every word you say is a new low in stupidity.",
      "You’re a walking catastrophe with no hope of recovery.",
      "You’re so toxic, you make poison look healthy.",
      "You’re the punchline to every bad joke.",
      "I’ve seen smarter rocks than you.",
      "You’re like a virus in human form.",
      "You’re a waste of oxygen and space.",
      "Your ignorance is only rivaled by your arrogance.",
      "I’d say ‘grow up,’ but you clearly missed that class.",
      "You’re a black hole of common sense.",
      "You make a clown look like a genius.",
    ];

    try {
      await interaction.reply({
        content: `⚠️ Starting to spam insults at ${user}...`,
        ephemeral: true
      });
      console.log("✅ Sent initial ephemeral reply.");
    } catch (err) {
      console.error("❌ Failed to send initial reply:", err);
      return;
    }

    console.log("⚡ Beginning spam loop...");
    let i = 0;

    for (const insult of insults) {
      if (i >= amount) break;
      i++;

      try {
        console.log(`Sending insult #${i}:`, insult);
        await interaction.channel.send(`${user} ${insult}`);
      } catch (err) {
        console.error(`❌ Failed to send insult #${i}:`, err);
      }

      await new Promise(resolve => setTimeout(resolve, 750)); // avoid rate limits
    }

    console.log("🎉 Finished sending insults.");
  },
};
