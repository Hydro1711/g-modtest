import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";

// Simple color palette for consistent embeds
const COLORS = {
  primary: 0x3498db,
  success: 0x2ecc71,
  danger: 0xe74c3c,
  warning: 0xf1c40f,
  info: 0x9b59b6,
  muted: 0x95a5a6,
};

// Small utility to simulate "animations" via delayed edits
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const data = new SlashCommandBuilder()
  .setName("minigame")
  .setDescription("Play a fun mini-game with yourself or a friend!")
  .addStringOption((option) =>
    option
      .setName("game")
      .setDescription("Choose a mini-game (or leave empty for a menu)")
      .setRequired(false)
      .addChoices(
        { name: "Rock Paper Scissors", value: "rps" },
        { name: "Tic Tac Toe", value: "tictactoe" },
        { name: "Connect 4", value: "connect4" },
        { name: "Dice Roll", value: "dice" },
        { name: "Coin Flip", value: "coin" },
      ),
  )
  .addUserOption((option) =>
    option
      .setName("opponent")
      .setDescription("Challenge another user (for multiplayer games)"),
  );

/**
 * Entry point for the slash command.
 */
export async function execute(interaction) {
  await interaction.deferReply();

  const initialGame = interaction.options.getString("game");
  const opponent = interaction.options.getUser("opponent");
  const player = interaction.user;

  if (opponent && opponent.id === player.id) {
    return interaction.editReply({
      content: "❌ You can’t play against yourself!",
    });
  }

  // If no game selected, open the fancy minigame menu UI
  if (!initialGame) {
    return showGameMenu(interaction, player, opponent);
  }

  // Otherwise go straight into the chosen game logic
  return handleGameStart(interaction, initialGame, player, opponent);
}

/**
 * Main menu UI – lets the user pick a game via buttons.
 */
async function showGameMenu(interaction, player, opponent) {
  const menuEmbed = new EmbedBuilder()
    .setTitle("🎮 Minigame Arcade")
    .setDescription(
      [
        "Welcome to the **Minigame Arcade**!",
        "",
        "Pick a game below to get started:",
        "• 🪨 **Rock Paper Scissors** – best of instinct! (2 players)",
        "• ⭕ **Tic Tac Toe** – classic 3x3 duel. (2 players)",
        "• 🟡 **Connect 4** – drop to victory. (2 players)",
        "• 🎲 **Dice Roll** – solo luck test.",
        "• 🪙 **Coin Flip** – solo coin toss.",
        "",
        opponent
          ? `Opponent selected: ${opponent}`
          : "Tip: For multiplayer games, set an `/opponent` in the command.",
      ].join("\n"),
    )
    .setColor(COLORS.primary)
    .setFooter({ text: "You have 60 seconds to choose a game." });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("menu_rps")
      .setLabel("🪨 Rock Paper Scissors")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("menu_tictactoe")
      .setLabel("⭕ Tic Tac Toe")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("menu_connect4")
      .setLabel("🟡 Connect 4")
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("menu_dice")
      .setLabel("🎲 Dice Roll")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("menu_coin")
      .setLabel("🪙 Coin Flip")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("menu_cancel")
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Danger),
  );

  const menuMessage = await interaction.editReply({
    embeds: [menuEmbed],
    components: [row1, row2],
  });

  const collector = menuMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  let chosen = false;

  collector.on("collect", async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      return btn.reply({
        content: "❌ Only the command user can pick the game from this menu.",
        ephemeral: true,
      });
    }

    await btn.deferUpdate();

    if (btn.customId === "menu_cancel") {
      chosen = true;
      collector.stop("cancelled");
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🚫 Minigame Cancelled")
            .setDescription("You closed the arcade menu.")
            .setColor(COLORS.muted),
        ],
        components: [],
      });
    }

    chosen = true;
    collector.stop("selected");

    const gameMap = {
      menu_rps: "rps",
      menu_tictactoe: "tictactoe",
      menu_connect4: "connect4",
      menu_dice: "dice",
      menu_coin: "coin",
    };

    const game = gameMap[btn.customId];
    if (!game) return;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎮 Minigame Selected")
          .setDescription(
            `You selected **${prettyGameName(game)}**. Preparing the game...`,
          )
          .setColor(COLORS.info),
      ],
      components: [],
    });

    await handleGameStart(interaction, game, interaction.user, opponent);
  });

  collector.on("end", async (_collected, reason) => {
    if (!chosen && reason !== "selected" && reason !== "cancelled") {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⌛ Menu Timed Out")
            .setDescription("You didn't pick a game in time.")
            .setColor(COLORS.muted),
        ],
        components: [],
      });
    }
  });
}

/**
 * Converts the internal game id into a nice display name.
 */
function prettyGameName(game) {
  switch (game) {
    case "rps":
      return "Rock Paper Scissors";
    case "tictactoe":
      return "Tic Tac Toe";
    case "connect4":
      return "Connect 4";
    case "dice":
      return "Dice Roll";
    case "coin":
      return "Coin Flip";
    default:
      return "Unknown Game";
  }
}

/**
 * Central handler that validates solo / multiplayer and dispatches.
 */
async function handleGameStart(interaction, game, player, opponent) {
  // Solo games logic (no opponent required)
  if (!opponent && ["dice", "coin"].includes(game)) {
    if (game === "dice") {
      return animatedDiceRoll(interaction, player);
    }
    if (game === "coin") {
      return animatedCoinFlip(interaction, player);
    }
  }

  // Games that require an opponent
  if (!opponent && ["rps", "tictactoe", "connect4"].includes(game)) {
    return interaction.editReply({
      content: "❌ This game requires an opponent! Use the `opponent` option.",
    });
  }

  // Multiplayer challenge flow
  if (opponent) {
    return createChallenge(interaction, game, player, opponent);
  }

  // Fallback, should not happen
  return interaction.editReply({
    content:
      "⚠️ Something went wrong starting the game. Please try again or pick a different one.",
  });
}

/**
 * Animated dice roll – fun multi-step embed.
 */
async function animatedDiceRoll(interaction, player) {
  const rollingEmbed = new EmbedBuilder()
    .setTitle("🎲 Dice Roll")
    .setDescription(`${player}, rolling your die...`)
    .setColor(COLORS.primary)
    .setFooter({ text: "Shaking the die..." });

  await interaction.editReply({ embeds: [rollingEmbed], components: [] });

  const stages = ["🎲 Rolling.", "🎲 Rolling..", "🎲 Rolling..."];

  for (const stage of stages) {
    await sleep(500);
    await interaction.editReply({
      embeds: [
        rollingEmbed.setDescription(`${player}, ${stage}`).setFooter({
          text: "Almost there...",
        }),
      ],
    });
  }

  const roll = Math.floor(Math.random() * 6) + 1;

  await sleep(400);

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎲 Dice Roll")
        .setDescription(`${player}, you rolled a **${roll}**!`)
        .setColor(COLORS.success),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dice_rematch_solo")
          .setLabel("🔁 Roll Again")
          .setStyle(ButtonStyle.Success),
      ),
    ],
  }).then((msg) => {
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== player.id) {
        return btn.reply({
          content: "❌ Only you can reroll this die.",
          ephemeral: true,
        });
      }
      if (btn.customId === "dice_rematch_solo") {
        await btn.deferUpdate();
        collector.stop("rematch");
        return animatedDiceRoll(btn, player);
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {
        // message might already be edited/deleted, ignore
      }
    });
  });
}

/**
 * Animated coin flip – fun multi-step embed.
 */
async function animatedCoinFlip(interaction, player) {
  const flippingEmbed = new EmbedBuilder()
    .setTitle("🪙 Coin Flip")
    .setDescription(`${player}, flipping your coin...`)
    .setColor(COLORS.primary)
    .setFooter({ text: "It spins in the air..." });

  await interaction.editReply({ embeds: [flippingEmbed], components: [] });

  const stages = ["🪙 Flipping.", "🪙 Flipping..", "🪙 Flipping..."];

  for (const stage of stages) {
    await sleep(500);
    await interaction.editReply({
      embeds: [
        flippingEmbed.setDescription(`${player}, ${stage}`).setFooter({
          text: "Catching...",
        }),
      ],
    });
  }

  const flip = Math.random() > 0.5 ? "Heads 🪙" : "Tails 🪙";

  await sleep(400);

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🪙 Coin Flip")
        .setDescription(`${player}, result: **${flip}**`)
        .setColor(COLORS.success),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("coin_rematch_solo")
          .setLabel("🔁 Flip Again")
          .setStyle(ButtonStyle.Success),
      ),
    ],
  }).then((msg) => {
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30_000,
    });

    collector.on("collect", async (btn) => {
      if (btn.user.id !== player.id) {
        return btn.reply({
          content: "❌ Only you can flip this coin again.",
          ephemeral: true,
        });
      }
      if (btn.customId === "coin_rematch_solo") {
        await btn.deferUpdate();
        collector.stop("rematch");
        return animatedCoinFlip(btn, player);
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {
        // ignore
      }
    });
  });
}

/**
 * Creates the challenge UI + handles accept/decline.
 */
async function createChallenge(interaction, game, player, opponent) {
  const inviteEmbed = new EmbedBuilder()
    .setTitle("🎮 Game Challenge!")
    .setDescription(
      `${player} has challenged ${opponent} to **${prettyGameName(
        game,
      )}**!\n\n${opponent}, do you accept?`,
    )
    .setColor(COLORS.primary)
    .setFooter({ text: "You have 60 seconds to accept or decline." });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("minigame_accept")
      .setLabel("✅ Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("minigame_decline")
      .setLabel("❌ Decline")
      .setStyle(ButtonStyle.Danger),
  );

  const inviteMsg = await interaction.editReply({
    embeds: [inviteEmbed],
    components: [row],
  });

  const inviteCollector = inviteMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  let accepted = false;

  inviteCollector.on("collect", async (btn) => {
    if (btn.user.id !== opponent.id) {
      return btn.reply({
        content: "❌ Only the invited player can respond to this challenge!",
        ephemeral: true,
      });
    }

    await btn.deferUpdate();

    if (btn.customId === "minigame_accept") {
      accepted = true;
      inviteCollector.stop("accepted");

      await inviteMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Challenge Accepted!")
            .setDescription(
              `${opponent} accepted the challenge! Starting **${prettyGameName(
                game,
              )}**...`,
            )
            .setColor(COLORS.success),
        ],
        components: [],
      });

      // Short "animation" before game actually starts
      await sleep(700);

      return startGame(interaction, game, player, opponent);
    } else {
      inviteCollector.stop("declined");
      return inviteMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Challenge Declined")
            .setDescription(`${opponent} declined the challenge.`)
            .setColor(COLORS.danger),
        ],
        components: [],
      });
    }
  });

  inviteCollector.on("end", async (_collected, reason) => {
    if (!accepted && reason !== "declined" && reason !== "accepted") {
      await inviteMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("⌛ Challenge Timed Out")
            .setDescription(`${opponent} didn’t respond in time.`)
            .setColor(COLORS.muted),
        ],
        components: [],
      });
    }
  });
}

/**
 * Game dispatcher – uses the interaction (or button interaction for rematch).
 */
async function startGame(interaction, game, player, opponent) {
  if (game === "rps") return playRPS(interaction, player, opponent);
  if (game === "tictactoe") return playTicTacToe(interaction, player, opponent);
  if (game === "connect4") return playConnect4(interaction, player, opponent);
}

// -------------------------------------------------------
// ROCK PAPER SCISSORS
// -------------------------------------------------------
async function playRPS(interaction, player, opponent) {
  const choices = ["rock", "paper", "scissors"];
  const choiceLabels = {
    rock: "🪨 Rock",
    paper: "📜 Paper",
    scissors: "✂️ Scissors",
  };

  const buttonsRow = new ActionRowBuilder().addComponents(
    choices.map((choice) =>
      new ButtonBuilder()
        .setCustomId(`rps_choice_${choice}`)
        .setLabel(choiceLabels[choice])
        .setStyle(ButtonStyle.Primary),
    ),
  );

  const embed = new EmbedBuilder()
    .setTitle("🪨 Rock Paper Scissors")
    .setDescription(`${player} vs ${opponent}\nPick your move!`)
    .setColor(COLORS.primary)
    .setFooter({ text: "Both players have 60 seconds to choose." });

  const msg = await interaction.followUp({
    embeds: [embed],
    components: [buttonsRow],
    fetchReply: true,
  });

  const moves = new Map(); // userId -> choice
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  let gameOver = false;

  collector.on("collect", async (i) => {
    if (![player.id, opponent.id].includes(i.user.id)) {
      return i.reply({
        content: "❌ You are not part of this game.",
        ephemeral: true,
      });
    }

    if (moves.has(i.user.id)) {
      return i.reply({
        content: "❌ You already picked your move!",
        ephemeral: true,
      });
    }

    const choice = i.customId.replace("rps_choice_", "");
    moves.set(i.user.id, choice);

    await i.reply({
      content: `✅ You picked **${choiceLabels[choice]}**!`,
      ephemeral: true,
    });

    if (moves.size === 2) {
      gameOver = true;
      collector.stop("finished");

      const p1Choice = moves.get(player.id);
      const p2Choice = moves.get(opponent.id);

      const result =
        p1Choice === p2Choice
          ? "It’s a tie!"
          : (p1Choice === "rock" && p2Choice === "scissors") ||
            (p1Choice === "paper" && p2Choice === "rock") ||
            (p1Choice === "scissors" && p2Choice === "paper")
          ? `${player} wins! 🎉`
          : `${opponent} wins! 🎉`;

      const resultEmbed = new EmbedBuilder()
        .setTitle("🪨 Rock Paper Scissors – Results")
        .setDescription(
          [
            `${player}: **${choiceLabels[p1Choice]}**`,
            `${opponent}: **${choiceLabels[p2Choice]}**`,
            "",
            result,
          ].join("\n"),
        )
        .setColor(COLORS.success);

      const rematchRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rps_rematch_${player.id}_${opponent.id}`)
          .setLabel("🔁 Rematch")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("rps_close")
          .setLabel("🛑 Close")
          .setStyle(ButtonStyle.Secondary),
      );

      await msg.edit({
        embeds: [resultEmbed],
        components: [rematchRow],
      });

      setupRpsRematchCollector(msg, player, opponent);
    }
  });

  collector.on("end", async (_collected, reason) => {
    if (!gameOver && reason !== "finished") {
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⌛ RPS Timed Out")
        .setDescription("Not all players responded in time.")
        .setColor(COLORS.muted);

      try {
        await msg.edit({
          embeds: [timeoutEmbed],
          components: [],
        });
      } catch {
        // ignore
      }
    }
  });
}

function setupRpsRematchCollector(msg, player, opponent) {
  const rematchCollector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  rematchCollector.on("collect", async (btn) => {
    if (![player.id, opponent.id].includes(btn.user.id)) {
      return btn.reply({
        content: "❌ Only the original players can use this.",
        ephemeral: true,
      });
    }

    if (btn.customId === "rps_close") {
      rematchCollector.stop("closed");
      await btn.deferUpdate();
      return msg.edit({ components: [] });
    }

    if (btn.customId.startsWith("rps_rematch_")) {
      rematchCollector.stop("rematch");
      await btn.deferUpdate();

      await msg.edit({
        components: [],
      });

      // Start a new RPS game using the button interaction
      return playRPS(btn, player, opponent);
    }
  });

  rematchCollector.on("end", async (_c, reason) => {
    if (reason !== "rematch" && reason !== "closed") {
      try {
        await msg.edit({ components: [] });
      } catch {
        // ignore
      }
    }
  });
}

// -------------------------------------------------------
// TIC TAC TOE
// -------------------------------------------------------
async function playTicTacToe(interaction, player, opponent) {
  let board = Array(9).fill(null);
  let currentPlayer = player;
  const symbols = {
    [player.id]: "❌",
    [opponent.id]: "⭕",
  };

  const renderBoard = (forceDisabled = false) => {
    const rows = [];

    for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
      const row = new ActionRowBuilder();

      for (let colIndex = 0; colIndex < 3; colIndex++) {
        const index = rowIndex * 3 + colIndex;
        const cell = board[index];

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`ttt_cell_${index}`)
            .setLabel(cell || "⬜")
            .setStyle(cell ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(forceDisabled || Boolean(cell)),
        );
      }

      rows.push(row);
    }

    return rows;
  };

  const statusEmbed = new EmbedBuilder()
    .setTitle("⭕ Tic Tac Toe ❌")
    .setDescription(`${player} vs ${opponent}\n${currentPlayer}, your turn!`)
    .setColor(COLORS.primary)
    .setFooter({ text: "Players have 60 seconds between moves." });

  const msg = await interaction.followUp({
    embeds: [statusEmbed],
    components: renderBoard(false),
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  let gameOver = false;

  collector.on("collect", async (i) => {
    if (![player.id, opponent.id].includes(i.user.id)) {
      return i.reply({
        content: "❌ You are not part of this game.",
        ephemeral: true,
      });
    }

    if (i.user.id !== currentPlayer.id) {
      return i.reply({
        content: "❌ It's not your turn!",
        ephemeral: true,
      });
    }

    const [, , indexStr] = i.customId.split("_"); // ttt_cell_X
    const index = parseInt(indexStr, 10);

    if (board[index]) {
      return i.reply({
        content: "❌ That spot is already taken!",
        ephemeral: true,
      });
    }

    board[index] = symbols[currentPlayer.id];

    const winner = checkTicTacToeWinner(board);
    const isBoardFull = board.every((cell) => cell !== null);

    if (winner || isBoardFull) {
      gameOver = true;
      collector.stop("finished");

      const resultText =
        winner === symbols[player.id]
          ? `${player} wins! 🎉`
          : winner === symbols[opponent.id]
          ? `${opponent} wins! 🎉`
          : "It's a tie!";

      const finalEmbed = new EmbedBuilder()
        .setTitle("⭕ Tic Tac Toe ❌ – Game Over")
        .setDescription(`${player} vs ${opponent}\n\n${resultText}`)
        .setColor(COLORS.success);

      const rematchRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_rematch_${player.id}_${opponent.id}`)
          .setLabel("🔁 Rematch")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("ttt_close")
          .setLabel("🛑 Close")
          .setStyle(ButtonStyle.Secondary),
      );

      await i.deferUpdate();
      await msg.edit({
        embeds: [finalEmbed],
        components: [...renderBoard(true), rematchRow],
      });

      setupTttRematchCollector(msg, player, opponent);
      return;
    }

    // Switch turn
    currentPlayer = currentPlayer.id === player.id ? opponent : player;

    const updatedEmbed = new EmbedBuilder()
      .setTitle("⭕ Tic Tac Toe ❌")
      .setDescription(`${player} vs ${opponent}\n${currentPlayer}, your turn!`)
      .setColor(COLORS.primary);

    await i.deferUpdate();
    await msg.edit({
      embeds: [updatedEmbed],
      components: renderBoard(false),
    });

    collector.resetTimer();
  });

  collector.on("end", async (_collected, reason) => {
    if (!gameOver && reason !== "finished") {
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⌛ Game Ended")
        .setDescription("Game timed out due to inactivity.")
        .setColor(COLORS.muted);

      try {
        await msg.edit({
          embeds: [timeoutEmbed],
          components: renderBoard(true),
        });
      } catch {
        // ignore
      }
    }
  });
}

function setupTttRematchCollector(msg, player, opponent) {
  const rematchCollector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  rematchCollector.on("collect", async (btn) => {
    if (![player.id, opponent.id].includes(btn.user.id)) {
      return btn.reply({
        content: "❌ Only the original players can use this.",
        ephemeral: true,
      });
    }

    if (btn.customId === "ttt_close") {
      rematchCollector.stop("closed");
      await btn.deferUpdate();
      return msg.edit({ components: [] });
    }

    if (btn.customId.startsWith("ttt_rematch_")) {
      rematchCollector.stop("rematch");
      await btn.deferUpdate();

      await msg.edit({
        components: [],
      });

      return playTicTacToe(btn, player, opponent);
    }
  });

  rematchCollector.on("end", async (_c, reason) => {
    if (reason !== "rematch" && reason !== "closed") {
      try {
        await msg.edit({ components: [] });
      } catch {
        // ignore
      }
    }
  });
}

function checkTicTacToeWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

// -------------------------------------------------------
// CONNECT 4
// -------------------------------------------------------
async function playConnect4(interaction, player, opponent) {
  const rows = 6;
  const cols = 7;
  let board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "⚪"),
  );
  let currentPlayer = player;
  const symbols = {
    [player.id]: "🔴",
    [opponent.id]: "🟡",
  };

  const renderBoardString = () =>
    board.map((row) => row.join("")).join("\n");

  const getButtons = () => {
    const topRow = new ActionRowBuilder();
    const bottomRow = new ActionRowBuilder();

    for (let col = 0; col < cols; col++) {
      const button = new ButtonBuilder()
        .setCustomId(`c4_col_${col}`)
        .setLabel(`${col + 1}`)
        .setStyle(ButtonStyle.Primary);

      if (col < 4) {
        topRow.addComponents(button);
      } else {
        bottomRow.addComponents(button);
      }
    }

    return [topRow, bottomRow];
  };

  const baseEmbed = () =>
    new EmbedBuilder()
      .setTitle("🟡 Connect 4 🔴")
      .setDescription(
        `${renderBoardString()}\n\n${currentPlayer}, your turn!`,
      )
      .setColor(COLORS.primary)
      .setFooter({ text: "Players have 60 seconds between moves." });

  const msg = await interaction.followUp({
    embeds: [baseEmbed()],
    components: getButtons(),
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  let gameOver = false;

  collector.on("collect", async (i) => {
    if (![player.id, opponent.id].includes(i.user.id)) {
      return i.reply({
        content: "❌ You are not part of this game.",
        ephemeral: true,
      });
    }

    if (i.user.id !== currentPlayer.id) {
      return i.reply({
        content: "❌ It's not your turn!",
        ephemeral: true,
      });
    }

    const col = parseInt(i.customId.replace("c4_col_", ""), 10);

    // Find the lowest empty slot in this column
    let placed = false;
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r][col] === "⚪") {
        board[r][col] = symbols[currentPlayer.id];
        placed = true;
        break;
      }
    }

    if (!placed) {
      return i.reply({
        content: "❌ That column is full! Choose another one.",
        ephemeral: true,
      });
    }

    const winner = checkConnect4(board);
    const isFull = board.every((row) =>
      row.every((cell) => cell !== "⚪"),
    );

    if (winner || isFull) {
      gameOver = true;
      collector.stop("finished");

      const resultText =
        winner === symbols[player.id]
          ? `${player} wins! 🎉`
          : winner === symbols[opponent.id]
          ? `${opponent} wins! 🎉`
          : "It's a tie!";

      const finalEmbed = new EmbedBuilder()
        .setTitle("🟡 Connect 4 🔴 – Game Over")
        .setDescription(`${renderBoardString()}\n\n${resultText}`)
        .setColor(COLORS.success);

      const rematchRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`c4_rematch_${player.id}_${opponent.id}`)
          .setLabel("🔁 Rematch")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("c4_close")
          .setLabel("🛑 Close")
          .setStyle(ButtonStyle.Secondary),
      );

      await i.deferUpdate();
      await msg.edit({
        embeds: [finalEmbed],
        components: [rematchRow],
      });

      setupConnect4RematchCollector(msg, player, opponent);
      return;
    }

    // Switch turn
    currentPlayer = currentPlayer.id === player.id ? opponent : player;

    await i.deferUpdate();
    await msg.edit({
      embeds: [baseEmbed()],
      components: getButtons(),
    });

    collector.resetTimer();
  });

  collector.on("end", async (_collected, reason) => {
    if (!gameOver && reason !== "finished") {
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⌛ Game Ended")
        .setDescription("Game timed out due to inactivity.")
        .setColor(COLORS.muted);

      try {
        await msg.edit({
          embeds: [timeoutEmbed],
          components: [],
        });
      } catch {
        // ignore
      }
    }
  });
}

function setupConnect4RematchCollector(msg, player, opponent) {
  const rematchCollector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  rematchCollector.on("collect", async (btn) => {
    if (![player.id, opponent.id].includes(btn.user.id)) {
      return btn.reply({
        content: "❌ Only the original players can use this.",
        ephemeral: true,
      });
    }

    if (btn.customId === "c4_close") {
      rematchCollector.stop("closed");
      await btn.deferUpdate();
      return msg.edit({ components: [] });
    }

    if (btn.customId.startsWith("c4_rematch_")) {
      rematchCollector.stop("rematch");
      await btn.deferUpdate();

      await msg.edit({
        components: [],
      });

      return playConnect4(btn, player, opponent);
    }
  });

  rematchCollector.on("end", async (_c, reason) => {
    if (reason !== "rematch" && reason !== "closed") {
      try {
        await msg.edit({ components: [] });
      } catch {
        // ignore
      }
    }
  });
}

function checkConnect4(board) {
  const numRows = board.length;
  const numCols = board[0].length;

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const cell = board[r][c];
      if (cell === "⚪") continue;

      // Horizontal
      if (
        c + 3 < numCols &&
        cell === board[r][c + 1] &&
        cell === board[r][c + 2] &&
        cell === board[r][c + 3]
      ) {
        return cell;
      }

      // Vertical
      if (
        r + 3 < numRows &&
        cell === board[r + 1][c] &&
        cell === board[r + 2][c] &&
        cell === board[r + 3][c]
      ) {
        return cell;
      }

      // Diagonal down-right
      if (
        r + 3 < numRows &&
        c + 3 < numCols &&
        cell === board[r + 1][c + 1] &&
        cell === board[r + 2][c + 2] &&
        cell === board[r + 3][c + 3]
      ) {
        return cell;
      }

      // Diagonal up-right
      if (
        r - 3 >= 0 &&
        c + 3 < numCols &&
        cell === board[r - 1][c + 1] &&
        cell === board[r - 2][c + 2] &&
        cell === board[r - 3][c + 3]
      ) {
        return cell;
      }
    }
  }

  return null;
}
