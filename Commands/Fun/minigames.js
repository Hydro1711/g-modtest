import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("minigame")
  .setDescription("Play a fun mini-game with yourself or a friend!")
  .addStringOption((option) =>
    option
      .setName("game")
      .setDescription("Choose a mini-game")
      .setRequired(true)
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

export async function execute(interaction) {
  await interaction.deferReply(); // acknowledge immediately

  const game = interaction.options.getString("game");
  const opponent = interaction.options.getUser("opponent");
  const player = interaction.user;

  if (opponent && opponent.id === player.id)
    return interaction.editReply({ content: "❌ You can’t play against yourself!" });

  // SOLO GAMES
  if (!opponent && ["dice", "coin"].includes(game)) {
    if (game === "dice") {
      const roll = Math.floor(Math.random() * 6) + 1;
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🎲 Dice Roll")
            .setDescription(`You rolled a **${roll}**!`)
            .setColor("Purple"),
        ],
      });
    }

    if (game === "coin") {
      const flip = Math.random() > 0.5 ? "Heads 🪙" : "Tails 🪙";
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🪙 Coin Flip")
            .setDescription(`Result: **${flip}**`)
            .setColor("Gold"),
        ],
      });
    }
  }

  // MULTIPLAYER GAMES
  if (!opponent) {
    return interaction.editReply({ content: "❌ This game requires an opponent!" });
  }

  const inviteEmbed = new EmbedBuilder()
    .setTitle("🎮 Game Challenge!")
    .setDescription(`${player} has challenged ${opponent} to **${game}**!\n\n${opponent}, do you accept?`)
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("accept").setLabel("✅ Accept").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("decline").setLabel("❌ Decline").setStyle(ButtonStyle.Danger),
  );

  const inviteMsg = await interaction.editReply({
    embeds: [inviteEmbed],
    components: [row],
  });

  const inviteCollector = inviteMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000,
  });

  let accepted = false;

  inviteCollector.on("collect", async (btn) => {
    if (btn.user.id !== opponent.id)
      return btn.reply({ content: "❌ Only the invited player can respond!", ephemeral: true });

    await btn.deferUpdate();

    if (btn.customId === "accept") {
      accepted = true;
      await inviteMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Challenge Accepted!")
            .setDescription(`${opponent} accepted the challenge! Starting...`)
            .setColor("Green"),
        ],
        components: [],
      });
      inviteCollector.stop();
      await startGame(interaction, game, player, opponent);
    } else {
      await inviteMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Challenge Declined")
            .setDescription(`${opponent} declined the challenge.`)
            .setColor("Red"),
        ],
        components: [],
      });
      inviteCollector.stop();
    }
  });

  inviteCollector.on("end", async () => {
    if (!accepted) {
      await inviteMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("⌛ Challenge Timed Out")
            .setDescription(`${opponent} didn’t respond in time.`)
            .setColor("Grey"),
        ],
        components: [],
      });
    }
  });
}

// ----------------------------
// Game Dispatcher
// ----------------------------
async function startGame(interaction, game, player, opponent) {
  if (game === "rps") return playRPS(interaction, player, opponent);
  if (game === "tictactoe") return playTicTacToe(interaction, player, opponent);
  if (game === "connect4") return playConnect4(interaction, player, opponent);
}

// ----------------------------
// ROCK PAPER SCISSORS
// ----------------------------
async function playRPS(interaction, player, opponent) {
  const choices = ["rock", "paper", "scissors"];
  const row = new ActionRowBuilder().addComponents(
    choices.map((c) =>
      new ButtonBuilder()
        .setCustomId(c)
        .setLabel(c === "rock" ? "🪨 Rock" : c === "paper" ? "📜 Paper" : "✂️ Scissors")
        .setStyle(ButtonStyle.Primary),
    ),
  );

  const embed = new EmbedBuilder()
    .setTitle("🪨 Rock Paper Scissors")
    .setDescription(`${player} vs ${opponent}\nPick your move!`)
    .setColor("Blue");

  const msg = await interaction.followUp({ embeds: [embed], components: [row], fetchReply: true });

  const moves = new Map();
  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

  collector.on("collect", async (i) => {
    if (![player.id, opponent.id].includes(i.user.id))
      return i.reply({ content: "❌ You are not part of this game.", ephemeral: true });

    if (moves.has(i.user.id))
      return i.reply({ content: "❌ You already picked!", ephemeral: true });

    moves.set(i.user.id, i.customId);
    await i.reply({ content: `✅ You picked **${i.customId}**!`, ephemeral: true });

    if (moves.size === 2) {
      const p1 = moves.get(player.id);
      const p2 = moves.get(opponent.id);
      const result =
        p1 === p2
          ? "It’s a tie!"
          : (p1 === "rock" && p2 === "scissors") ||
            (p1 === "paper" && p2 === "rock") ||
            (p1 === "scissors" && p2 === "paper")
          ? `${player} wins! 🎉`
          : `${opponent} wins! 🎉`;

      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("🪨 Rock Paper Scissors Results")
            .setDescription(`${player}: **${p1}**\n${opponent}: **${p2}**\n\n${result}`)
            .setColor("Green"),
        ],
        components: [],
      });
      collector.stop();
    }
  });

  collector.on("end", async () => {
    if (moves.size < 2)
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("⌛ RPS Timed Out")
            .setDescription("Not all players responded in time.")
            .setColor("Grey"),
        ],
        components: [],
      });
  });
}

// ----------------------------
// TIC TAC TOE
// ----------------------------
async function playTicTacToe(interaction, player, opponent) {
  let board = Array(9).fill(null);
  let currentPlayer = player;
  const symbols = { [player.id]: "❌", [opponent.id]: "⭕" };

  const renderBoard = () => {
    return Array(3).fill(0).map((rowIndex) =>
      new ActionRowBuilder().addComponents(
        board.slice(rowIndex * 3, rowIndex * 3 + 3).map((cell, i) =>
          new ButtonBuilder()
            .setCustomId(String(rowIndex * 3 + i))
            .setLabel(cell || " ")
            .setStyle(cell ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(Boolean(cell))
        )
      )
    );
  };

  let msg = await interaction.followUp({
    embeds: [
      new EmbedBuilder()
        .setTitle("⭕ Tic Tac Toe ❌")
        .setDescription(`${player} vs ${opponent}\n${currentPlayer}, your turn!`)
        .setColor("Blue"),
    ],
    components: renderBoard(),
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

  collector.on("collect", async (i) => {
    if (i.user.id !== currentPlayer.id)
      return i.reply({ content: "❌ Not your turn!", ephemeral: true });

    const index = parseInt(i.customId);
    if (board[index]) return i.reply({ content: "❌ Spot already taken!", ephemeral: true });

    board[index] = symbols[currentPlayer.id];
    currentPlayer = currentPlayer.id === player.id ? opponent : player;

    const winner = checkWinner(board);
    if (winner || board.every((c) => c)) {
      const result =
        winner === "❌" ? `${player} wins! 🎉` :
        winner === "⭕" ? `${opponent} wins! 🎉` : "It's a tie!";
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("⭕ Tic Tac Toe ❌ - Game Over")
            .setDescription(result)
            .setColor("Green"),
        ],
        components: [],
      });
      return collector.stop();
    }

    await i.deferUpdate();
    await msg.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle("⭕ Tic Tac Toe ❌")
          .setDescription(`${player} vs ${opponent}\n${currentPlayer}, your turn!`)
          .setColor("Blue"),
      ],
      components: renderBoard(),
    });
  });

  collector.on("end", async () => {
    if (!board.every((c) => c))
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("⌛ Game Ended")
            .setDescription("Game timed out.")
            .setColor("Grey"),
        ],
        components: [],
      });
  });
}

function checkWinner(b) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, c, d] of lines)
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return null;
}

// ----------------------------
// CONNECT 4
// ----------------------------
async function playConnect4(interaction, player, opponent) {
  const rows = 6, cols = 7;
  let board = Array(rows).fill(null).map(() => Array(cols).fill("⚪"));
  let currentPlayer = player;
  const symbols = { [player.id]: "🔴", [opponent.id]: "🟡" };

  const renderBoard = () => board.map((r) => r.join("")).join("\n");
  const getButtons = () => [
    new ActionRowBuilder().addComponents(
      Array.from({ length: 4 }, (_, i) =>
        new ButtonBuilder().setCustomId(String(i)).setLabel(`${i + 1}`).setStyle(ButtonStyle.Primary),
      ),
    ),
    new ActionRowBuilder().addComponents(
      Array.from({ length: 3 }, (_, i) =>
        new ButtonBuilder().setCustomId(String(i + 4)).setLabel(`${i + 5}`).setStyle(ButtonStyle.Primary),
      ),
    ),
  ];

  const msg = await interaction.followUp({
    embeds: [
      new EmbedBuilder()
        .setTitle("🟡 Connect 4 🔴")
        .setDescription(`${renderBoard()}\n\n${currentPlayer}, your turn!`)
        .setColor("Blue"),
    ],
    components: getButtons(),
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

  collector.on("collect", async (i) => {
    if (i.user.id !== currentPlayer.id)
      return i.reply({ content: "❌ Not your turn!", ephemeral: true });

    const col = parseInt(i.customId);
    const row = [...board].reverse().findIndex((r) => r[col] === "⚪");
    if (row === -1) return i.reply({ content: "❌ Column full!", ephemeral: true });

    board[rows - 1 - row][col] = symbols[currentPlayer.id];
    const winner = checkConnect4(board);

    if (winner || board.every((r) => r.every((c) => c !== "⚪"))) {
      const result =
        winner === "🔴" ? `${player} wins! 🎉` :
        winner === "🟡" ? `${opponent} wins! 🎉` : "It's a tie!";
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("🟡 Connect 4 🔴 - Game Over")
            .setDescription(`${renderBoard()}\n\n${result}`)
            .setColor("Green"),
        ],
        components: [],
      });
      return collector.stop();
    }

    currentPlayer = currentPlayer.id === player.id ? opponent : player;
    await i.deferUpdate();
    await msg.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle("🟡 Connect 4 🔴")
          .setDescription(`${renderBoard()}\n\n${currentPlayer}, your turn!`)
          .setColor("Blue"),
      ],
      components: getButtons(),
    });
  });

  collector.on("end", async () => {
    if (board.some((r) => r.includes("⚪")))
      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("⌛ Game Ended")
            .setDescription("Game timed out.")
            .setColor("Grey"),
        ],
        components: [],
      });
  });
}

function checkConnect4(board) {
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (cell === "⚪") continue;
      if (
        c + 3 < board[0].length &&
        cell === board[r][c + 1] &&
        cell === board[r][c + 2] &&
        cell === board[r][c + 3]
      ) return cell;
      if (
        r + 3 < board.length &&
        cell === board[r + 1][c] &&
        cell === board[r + 2][c] &&
        cell === board[r + 3][c]
      ) return cell;
      if (
        r + 3 < board.length &&
        c + 3 < board[0].length &&
        cell === board[r + 1][c + 1] &&
        cell === board[r + 2][c + 2] &&
        cell === board[r + 3][c + 3]
      ) return cell;
      if (
        r - 3 >= 0 &&
        c + 3 < board[0].length &&
        cell === board[r - 1][c + 1] &&
        cell === board[r - 2][c + 2] &&
        cell === board[r - 3][c + 3]
      ) return cell;
    }
  return null;
}
