import { ApplicationCommandType } from "discord.js";
import { loadFiles } from "../Functions/fileLoader.js";
import ascii from "ascii-table";
import path from "path";
import { pathToFileURL } from "url";

export async function loadCommands(client) {
  const table = new ascii().setHeading("Commands", "Type / Status");

  // ----------- Clear previous commands -----------
  client.commands.clear();       // Slash / Context commands
  client.subCommands.clear();    // Subcommands
  client.prefixCommands = new Map(); // Prefix commands

  const slashCommandsArray = [];

// ----------- Load Slash / Context Commands -----------
const slashFiles = (await loadFiles("Commands"))
  .filter(f => !f.toLowerCase().includes("prefix commands"));
  for (const file of slashFiles) {
    let imported;
    try {
      imported = await import(pathToFileURL(file).href);
    } catch (err) {
      console.error(`❌ Failed to import ${file}:`, err);
      table.addRow(path.basename(file), "🔴 Import failed");
      continue;
    }

    const command = imported.default || imported;

    if (!command) {
      table.addRow(path.basename(file), "🔴 No export found");
      continue;
    }

    // Subcommand handling
    if (command.subCommand) {
      client.subCommands.set(command.subCommand, command);
      table.addRow(command.subCommand, "🟪 Subcommand");
      continue;
    }

    // Slash / Context
    if (command.data && typeof command.execute === "function") {
      client.commands.set(command.data.name, command);

      if (typeof command.data.toJSON === "function") {
        slashCommandsArray.push(command.data.toJSON());
      }

      table.addRow(command.data.name, "🟩 Slash/Context");
    } else {
      table.addRow(path.basename(file), "🔴 Missing data or execute");
      console.warn(`⚠️ Slash/Context command missing .data or .execute: ${file}`);
    }
  }

  // Register all slash commands globally
  try {
    await client.application.commands.set(slashCommandsArray);
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }

  // ----------- Load Prefix Commands -----------
  const prefixFiles = await loadFiles("Commands/Prefix Commands");

  for (const file of prefixFiles) {
    let imported;
    try {
      imported = await import(pathToFileURL(file).href);
    } catch (err) {
      console.error(`❌ Failed to import prefix command ${file}:`, err);
      table.addRow(path.basename(file), "🔴 Import failed");
      continue;
    }

    const command = imported.default || imported;

    if (!command) {
      console.warn(`⚠️ No export found in prefix command file: ${file}`);
      table.addRow(path.basename(file), "🔴 No export found");
      continue;
    }

    if (typeof command.name === "string" && typeof command.execute === "function") {
      client.prefixCommands.set(command.name.toLowerCase(), command);
      table.addRow(command.name, "🟨 Prefix");
    } else {
      table.addRow(path.basename(file), "🔴 Invalid prefix command");
      console.error(`❌ Failed to load prefix command: ${file}`);
    }
  }

  console.log(table.toString(), "\nCommands Loaded.");
}
