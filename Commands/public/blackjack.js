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
// const isCasinoCommandAllowed = require("../../utils/isCasinoCommandAllowed"); // adjust or uncomment

const MIN_BET = 50;
const MAX_BET = 100000;
const GAME_TIMEOUT = 60_000; // 60 seconds
const DECKS = 6;

// Card helpers
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ rank, suit });
      }
    }
  }
  // shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces++;
      total += 11;
    } else if (["J","Q","K"].includes(c.rank)) {
      total += 10;
    } else {
      total += Number(c.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatHand(cards, hideFirst = false) {
  if (hideFirst && cards.length > 0) {
    const rest = cards.slice(1).map(c => `${c.rank}${c.suit}`).join(" ");
    return `🂠 ${rest}`.trim();
  }
  return cards.map(c => `${c.rank}${c.suit}`).join(" ");
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play an advanced blackjack game for chips.")
    .addIntegerOption(opt =>
      opt
        .setName("bet")
        .setDescription("How many chips to bet.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("bet");

    try {
      // Optional casino-channel check
      // const allowed = await isCasinoCommandAllowed(interaction);
      // if (!allowed) return;

      if (bet < MIN_BET) {
        return interaction.reply({
          content: `Bet must be at least ${MIN_BET} chips.`,
          ephemeral: true,
        });
      }
      if (bet > MAX_BET) {
        return interaction.reply({
          content: `Bet cannot exceed ${MAX_BET} chips.`,
          ephemeral: true,
        });
      }

      let user = await User.findOne({ userId });
      if (!user) user = await User.create({ userId, chips: 0 });

      if ((user.chips || 0) < bet) {
        return interaction.reply({
          content: "You don't have enough chips for that bet.",
          ephemeral: true,
        });
      }

      // Deduct bet up-front
      user.chips -= bet;
      await user.save();

      // Initialize game state
      let shoe = createShoe();
      const playerHand = [];
      const dealerHand = [];

      // deal initial cards
      playerHand.push(shoe.pop());
      dealerHand.push(shoe.pop());
      playerHand.push(shoe.pop());
      dealerHand.push(shoe.pop());

      let gameOver = false;
      let canDouble = true;
      let surrendered = false;
      let finalResultText = "";
      let winnings = 0;
      let doubled = false;

      function buildEmbed(stateUserChips) {
        const playerVal = handValue(playerHand);
        const dealerValShown = handValue([dealerHand[1]]); // upcard

        const descLines = [
          `Bet: **${bet.toLocaleString()}** chips${doubled ? " (Doubled)" : ""}`,
          "",
          `**Your Hand** (${playerVal}):`,
          formatHand(playerHand),
          "",
          "**Dealer Hand** (showing):",
          formatHand(dealerHand, true),
        ];

        if (gameOver) {
          const dealerVal = handValue(dealerHand);
          descLines.splice(
            4,
            2,
            `**Dealer Final Hand** (${dealerVal}):`,
            formatHand(dealerHand, false)
          );
          descLines.push("");
          descLines.push(finalResultText);
          descLines.push("");
          descLines.push(`Your new balance: **${stateUserChips.toLocaleString()}** chips.`);
        }

        const embed = new EmbedBuilder()
          .setColor(gameOver ? Colors.Green : Colors.Blue)
          .setTitle("🃏 Blackjack")
          .setDescription(descLines.join("\n"))
          .setFooter({ text: gameOver ? "Game over." : "Use the buttons to play your hand." })
          .setTimestamp();

        return embed;
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("bj-hit")
          .setLabel("Hit")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("bj-stand")
          .setLabel("Stand")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("bj-double")
          .setLabel("Double")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("bj-surrender")
          .setLabel("Surrender")
          .setStyle(ButtonStyle.Danger),
      );

      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(row.components[0]).setDisabled(true),
        ButtonBuilder.from(row.components[1]).setDisabled(true),
        ButtonBuilder.from(row.components[2]).setDisabled(true),
        ButtonBuilder.from(row.components[3]).setDisabled(true),
      );

      // handle natural blackjack
      const playerValInit = handValue(playerHand);
      const dealerValInit = handValue(dealerHand);
      if (isBlackjack(playerHand) || isBlackjack(dealerHand)) {
        gameOver = true;
        if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
          winnings = Math.floor(bet * 2.5); // original bet already removed, pay 2.5x => net +1.5x
          user.chips += winnings;
          await user.save();
          finalResultText = `Blackjack! You win **${winnings.toLocaleString()}** chips (3:2 payout).`;
        } else if (!isBlackjack(playerHand) && isBlackjack(dealerHand)) {
          winnings = 0; // lost bet already deducted
          finalResultText = "Dealer has blackjack. You lost your bet.";
        } else {
          // push -> refund bet
          winnings = bet;
          user.chips += bet;
          await user.save();
          finalResultText = "Both you and the dealer have blackjack. It's a push. Your bet was returned.";
        }

        const embed = new EmbedBuilder()
          .setColor(Colors.Gold)
          .setTitle("🃏 Blackjack - Natural Resolution")
          .setDescription(
            [
              `**Your Hand** (${playerValInit}):`,
              formatHand(playerHand),
              "",
              `**Dealer Hand** (${dealerValInit}):`,
              formatHand(dealerHand),
              "",
              finalResultText,
              "",
              `Your new balance: **${user.chips.toLocaleString()}** chips.`,
            ].join("\n")
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [disabledRow] });
        return;
      }

      // normal flow: send first state
      const msg = await interaction.reply({
        embeds: [buildEmbed(user.chips)],
        components: [row],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: GAME_TIMEOUT,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== userId) {
          return i.reply({ content: "This is not your game.", ephemeral: true });
        }
        if (gameOver) {
          return i.reply({ content: "This game is already over.", ephemeral: true });
        }

        await i.deferUpdate();

        const currentVal = handValue(playerHand);

        if (i.customId === "bj-hit") {
          canDouble = false;
          playerHand.push(shoe.pop());
          const newVal = handValue(playerHand);

          if (newVal > 21) {
            // bust
            gameOver = true;
            winnings = 0;
            finalResultText = "You busted. You lost your bet.";
            const embed = buildEmbed(user.chips);
            await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
            collector.stop("bust");
            return;
          }

          const embed = buildEmbed(user.chips);
          await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
          return;
        }

        if (i.customId === "bj-double") {
          if (!canDouble || (user.chips || 0) < bet) {
            // can't double
            await i.followUp({ content: "You cannot double right now.", ephemeral: true }).catch(() => {});
            return;
          }

          // take additional bet
          user = await User.findOne({ userId }) || user;
          if ((user.chips || 0) < bet) {
            await i.followUp({ content: "You don't have enough chips to double.", ephemeral: true }).catch(() => {});
            return;
          }

          user.chips -= bet;
          await user.save();
          doubled = true;
          canDouble = false;

          // one card and then stand
          playerHand.push(shoe.pop());
          const newVal = handValue(playerHand);
          if (newVal > 21) {
            // bust
            gameOver = true;
            finalResultText = "You doubled and busted. You lost your bet.";
            const embed = buildEmbed(user.chips);
            await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
            collector.stop("bust");
            return;
          }

          // go straight to dealer play
          // (fall through to stand logic)
        }

        if (i.customId === "bj-surrender") {
          // lose half bet
          surrendered = true;
          gameOver = true;
          const refund = Math.floor(bet / 2);
          user = await User.findOne({ userId }) || user;
          user.chips += refund;
          await user.save();
          finalResultText = `You surrendered and got **${refund.toLocaleString()}** chips back (half your bet).`;
          const embed = buildEmbed(user.chips);
          await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
          collector.stop("surrender");
          return;
        }

        if (i.customId === "bj-stand" || (i.customId === "bj-double" && !gameOver)) {
          // dealer plays
          gameOver = true;
          let dealerVal = handValue(dealerHand);
          while (dealerVal < 17) {
            dealerHand.push(shoe.pop());
            dealerVal = handValue(dealerHand);
          }

          const playerValFinal = handValue(playerHand);

          user = await User.findOne({ userId }) || user;

          if (dealerVal > 21) {
            // dealer busts -> player wins full
            const totalBet = doubled ? bet * 2 : bet;
            const reward = totalBet * 2;
            user.chips += reward;
            winnings = reward;
            finalResultText = `Dealer busted. You win **${reward.toLocaleString()}** chips.`;
          } else if (dealerVal > playerValFinal) {
            winnings = 0;
            finalResultText = "Dealer wins. You lost your bet.";
          } else if (dealerVal < playerValFinal) {
            const totalBet = doubled ? bet * 2 : bet;
            const reward = totalBet * 2;
            user.chips += reward;
            winnings = reward;
            finalResultText = `You beat the dealer and win **${reward.toLocaleString()}** chips.`;
          } else {
            // push -> refund
            const totalBet = doubled ? bet * 2 : bet;
            user.chips += totalBet;
            winnings = totalBet;
            finalResultText = "It's a push. Your bet was returned.";
          }

          await user.save();
          const embed = buildEmbed(user.chips);
          await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
          collector.stop("stand");
        }
      });

      collector.on("end", async (collected, reason) => {
        if (!gameOver && reason === "time") {
          gameOver = true;
          finalResultText = "Time ran out. Game cancelled. Your bet has been refunded.";
          user = await User.findOne({ userId }) || user;
          user.chips += bet; // refund original bet
          await user.save();

          const embed = new EmbedBuilder()
            .setColor(Colors.Grey)
            .setTitle("🃏 Blackjack - Timed Out")
            .setDescription(
              [
                "You took too long to respond.",
                "",
                `Your bet of **${bet.toLocaleString()}** chips was refunded.`,
                `Your new balance: **${user.chips.toLocaleString()}** chips.`,
              ].join("\n")
            )
            .setTimestamp();

          await msg.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
        }
      });
    } catch (err) {
      console.error("Error in /blackjack:", err);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "❌ Error while starting blackjack." }).catch(() => {});
      } else {
        await interaction.reply({ content: "❌ Error while starting blackjack.", ephemeral: true }).catch(() => {});
      }
    }
  },
};
