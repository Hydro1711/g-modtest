const { loadFiles } = require("../Functions/fileLoader");
const ascii = require("ascii-table");

async function loadPrefixCommands(client) {
    client.prefixCommands = new Map();
    const table = new ascii().setHeading("Prefix Commands", "Status");

    const files = await loadFiles("Prefix");

    for (const file of files) {
        const cmd = require(file);
        if (!cmd.name || !cmd.execute) {
            table.addRow(file.split("/").pop(), "🔴 Missing name/execute");
            continue;
        }
        client.prefixCommands.set(cmd.name, cmd);
        table.addRow(cmd.name, "🟩 Loaded");
    }

    console.log(table.toString());
}

module.exports = { loadPrefixCommands };
