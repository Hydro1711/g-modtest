const { ApplicationCommandType } = require("discord.js");

async function loadCommands(client) {
  const { loadFiles } = require("../Functions/fileLoader");
  const ascii = require("ascii-table");
  const table = new ascii().setHeading("Commands", "Status");

  await client.commands.clear();
  await client.subCommands.clear();
  
  let commandsArray = [];

  const Files = await loadFiles("Commands"); // This loads ALL files from /commands/** subfolders

  Files.forEach((file) => {
    const command = require(file);

    // Subcommand check
    if (command.subCommand) {
      return client.subCommands.set(command.subCommand, command);
    }

    // Check if the command has data and execute
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      commandsArray.push(command.data.toJSON());

      // Log the type
      const type = command.data.type === ApplicationCommandType.User ? "🟦 APP" :
                   command.data.type === ApplicationCommandType.Message ? "🟪 Message" :
                   "🟩 Slash";
      
      table.addRow(command.data.name, type);
    } else {
      table.addRow(file.split("/").pop(), "🔴 Missing data or execute");
    }
  });

  await client.application.commands.set(commandsArray);

  return console.log(table.toString(), "\nCommands Loaded.");
}

module.exports = { loadCommands };
