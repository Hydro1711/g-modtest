import ascii from "ascii-table";
import { loadFiles } from "../Functions/fileLoader.js";

export async function loadEvents(client) {
  const table = new ascii().setHeading("Events", "Status");

  // Clear the map (doesn't touch discord.js internal listeners)
  client.events.clear();

  const files = await loadFiles("Events");

  // If your glob returns duplicate paths or you have duplicate event names, this prevents stacking.
  const seenNames = new Set();

  for (const fileUrl of files) {
    const imported = await import(fileUrl);
    const event = imported.default ?? imported;

    if (!event?.name || typeof event.execute !== "function") {
      table.addRow(fileUrl.split("/").pop(), "🟥");
      continue;
    }

    // If you accidentally have multiple files exporting the same event.name (e.g., messageCreate),
    // we only register the first one to avoid 20+ listeners.
    if (seenNames.has(event.name)) {
      continue;
    }
    seenNames.add(event.name);

    // Remove existing listeners for just this event name (safe)
    if (event.rest) client.rest.removeAllListeners(event.name);
    else client.removeAllListeners(event.name);

    const execute = (...args) => event.execute(...args, client);
    client.events.set(event.name, execute);

    if (event.rest) {
      if (event.once) client.rest.once(event.name, execute);
      else client.rest.on(event.name, execute);
    } else {
      if (event.once) client.once(event.name, execute);
      else client.on(event.name, execute);
    }

    table.addRow(event.name, "🟩");
  }

  console.log(table.toString(), "\nLoaded Events.");
}
