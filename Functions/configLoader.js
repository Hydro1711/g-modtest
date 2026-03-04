import configDatabase from "../Schemas/MemberLog.js";

export async function loadConfig(client) {
  const docs = await configDatabase.find();

  docs.forEach((doc) => {
    client.guildConfig.set(doc.Guild, {
      logChannel: doc.logChannel,
      memberRole: doc.memberRole,
      botRole: doc.botRole,
    });
  });

  console.log("Loaded Guild Configs to the Collection.");
}
