async function loadEvents(client) {
  const { loadFiles } = require("../Functions/fileLoader");
  const ascii = require("ascii-table");
  const table = new ascii().setHeading("Events", "Status");

  // Only clear listeners that WE attach per event name (not everything)
  // Do not nuke all listeners globally.

  client.events.clear();

  const files = await loadFiles("Events");

  // prevent duplicates by event name
  const seen = new Set();

  for (const file of files) {
    try {
      const event = require(file);

      // validate
      if (!event?.name || typeof event.execute !== "function") {
        table.addRow(file.split("/").pop(), "🟥");
        console.error(`❌ Invalid event export in ${file}`);
        continue;
      }

      // skip duplicates (your folder has many messageCreate exports)
      if (seen.has(event.name)) {
        table.addRow(`${event.name} (dup)`, "🟨");
        continue;
      }
      seen.add(event.name);

      // remove existing listeners for this event name to avoid stacking
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
    } catch (err) {
      table.addRow(file.split("/").pop(), "🟥");
      console.error(`❌ Failed to load event file: ${file}`);
      console.error(err);
    }
  }

  console.log(table.toString(), "\nLoaded Events.");
}

module.exports = { loadEvents };
