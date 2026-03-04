import ascii from "ascii-table";
import { loadFiles } from "../Functions/fileLoader.js";

export async function loadEvents(client) {
  const table = new ascii().setHeading("Events", "Status");

  // clear your map so reloading doesn't duplicate
  client.events.clear();

  const files = await loadFiles("Events");

  // Track names to avoid printing/attaching duplicates
  const seen = new Set();

  for (const file of files) {
    // Dynamic import in ESM
    const imported = await import(file);
    const event = imported.default ?? imported;

    if (!event?.name || typeof event.execute !== "function") {
      table.addRow(file.split("/").pop(), "🟥");
      continue;
    }

    // If two files export same event.name, skip the duplicates
    if (seen.has(event.name)) {
      continue;
    }
    seen.add(event.name);

    // IMPORTANT: remove listeners ONLY for this event
    // (don't nuke all listeners globally)
    if (event.rest) {
      client.rest.removeAllListeners(event.name);
    } else {
      client.removeAllListeners(event.name);
    }

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
