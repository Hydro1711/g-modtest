const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const CarCommandSetting = require("../../Schemas/carCommandSetting.js");
const IgnoredUser = require("../../Schemas/ignoredUsers.js");

const commandGifs = {
  e30: [
           "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdxOHh5ZjY3eGQ3Y3A2b245N2c0ZHRxdDI2cTFpYnR3Z3IxZnl1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/CPORCiJUifPlXUhPAn/giphy.gif",
               "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdxOHh5ZjY3eGQ3Y3A2b245N2c0ZHRxdDI2cTFpYnR3Z3IxZnl1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/P1HNNo5ujqfaB2EelQ/giphy.gif",
                 "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdxOHh5ZjY3eGQ3Y3A2b245N2c0ZHRxdDI2cTFpYnR3Z3IxZnl1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8PiQ8cKfZ2oxtZ5ZBw/giphy.gif",
                 "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdxOHh5ZjY3eGQ3Y3A2b245N2c0ZHRxdDI2cTFpYnR3Z3IxZnl1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hQolyY139rKcF6MM6N/giphy.gif",
                 "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdxOHh5ZjY3eGQ3Y3A2b245N2c0ZHRxdDI2cTFpYnR3Z3IxZnl1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Y7ISMpR8SPqJG/giphy.gif",
                 "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzdxOHh5ZjY3eGQ3Y3A2b245N2c0ZHRxdDI2cTFpYnR3Z3IxZnl1bSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/bfyAhSvvhDd8A/giphy.gif",
         ],
  e60: [
          "https://cdn.discordapp.com/attachments/1381025674613231636/1408043648054202429/image0.gif?ex=68a84e55&is=68a6fcd5&hm=3493be87748832b71b2d0efd8c8c92eba5c97333bb2082f6e7241ddc84bd817e&",
                "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzRqaTJxaDFwcm93MXJqbzZjOXF2MnRqejdweW1pN2lmOGhzeGdpOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kyBw5zLdIGCUX83Gdo/giphy.gif",
                "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3VzeWZld2hobGI0OThrNnVlc2k4bnk0OGcwdzFlazdsZzFrbm03ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8xJAjwbX2LOP6jP4AM/giphy.gif",
                "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExY204NWlneGU3MWtlbTZxeXRsdXVhcmxzNXBzOGJtOGtqYXN4NzNrdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RIWNtwzSxrxLnxISsJ/giphy.gif",
                "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ21qMjBxa3QyNTFwMDhjdmN3dnpvNTIzbGwydGR5Z3ZqN2U4cHd1eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Weap9FrmPUwmFsQRFH/giphy.gif",
                "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGJha2Fva2RoMHZlemQ2aHkwY3R6MDdsZXBhZDRjcHhtbDl5d3Y5ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/C9KsHjCMNkQJlHcUUa/giphy.gif",
        ],
  e92: [
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBhcXFpaHZzZHN4djU0NGY3NHMzMmlqdjIxaWJ0MHRyOGNxaWZpeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xbXHKfXvWYTGzCUs7U/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBhcXFpaHZzZHN4djU0NGY3NHMzMmlqdjIxaWJ0MHRyOGNxaWZpeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kMCohRq17qTr4yzGtT/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBhcXFpaHZzZHN4djU0NGY3NHMzMmlqdjIxaWJ0MHRyOGNxaWZpeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2GLus7b4nzCXjgw2hu/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBhcXFpaHZzZHN4djU0NGY3NHMzMmlqdjIxaWJ0MHRyOGNxaWZpeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hn8SHc0dScyCAmkb7N/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBhcXFpaHZzZHN4djU0NGY3NHMzMmlqdjIxaWJ0MHRyOGNxaWZpeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/TfUscEVhMF499tJ4D6/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXBhcXFpaHZzZHN4djU0NGY3NHMzMmlqdjIxaWJ0MHRyOGNxaWZpeSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3pQXWTla6A8K8Gdyy2/giphy.gif",
        ],
  f82: [
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXgzeTRnZDU4YTg4d3IxaDk3cDE1ZDdwbmk1aWR5M3cwYjFhdjZ0eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/9mPcR7vgfLYbcFuhN9/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXgzeTRnZDU4YTg4d3IxaDk3cDE1ZDdwbmk1aWR5M3cwYjFhdjZ0eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/iLyZf9gDUaO5q7TJIj/giphy.gif",
        ],
  g80: [
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3RmZzhremFpcGdhems5NGF2YXlyazhheXc0emV4M2tyNWZkOHBjMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Bn5ATwEYFxez6ReQCh/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3RmZzhremFpcGdhems5NGF2YXlyazhheXc0emV4M2tyNWZkOHBjMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/s61GodoV54oaKkDf7B/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3RmZzhremFpcGdhems5NGF2YXlyazhheXc0emV4M2tyNWZkOHBjMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/f6R3ijvEeshaUd3cAQ/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3RmZzhremFpcGdhems5NGF2YXlyazhheXc0emV4M2tyNWZkOHBjMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/aWI5bSkuFosSQgEKIP/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExa3RmZzhremFpcGdhems5NGF2YXlyazhheXc0emV4M2tyNWZkOHBjMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Lpr3nNTWuGXI6Yte11/giphy.gif",
        ],
  g87: [
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY21iYm11bGgzZTF4MmdueDNmN2pvZXc1Zmg4emUwbXU0MDgya3dvNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vpvHmlP4c9DH72NLgb/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY21iYm11bGgzZTF4MmdueDNmN2pvZXc1Zmg4emUwbXU0MDgya3dvNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cWFxyQm7CdPwZbAr3O/giphy.gif",
                "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMW00NjFheXY4N2R1Z21nMXJtY29ldWZvODNxempteWM4c2ozdWE3ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aESvOsuQmMc30AIJe8/giphy.gif",
                "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXRlZ3IwdHRnaTN3ajQ5a3pwMGpldXZvaHI4NWVma3pvZnEwMjVzbCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3zuFoGWd3xJx1TFy1d/giphy.gif",
               "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY21iYm11bGgzZTF4MmdueDNmN2pvZXc1Zmg4emUwbXU0MDgya3dvNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/vpvHmlP4c9DH72NLgb/giphy.gif",
        ]
};

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();
    const userId = message.author.id;
    const permissions = message.channel.permissionsFor(message.guild.members.me);
    const guildId = message.guild.id;

    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) return;

    const carSetting = await CarCommandSetting.findOne({ guildId });

    for (const [cmd, gifs] of Object.entries(commandGifs)) {
      if (contentLower.includes(cmd)) {
        const ignored = await IgnoredUser.findOne({ userId });
        if (ignored) {
          await message.channel.send(`<@${userId}> The owner does not think you are cool enough to use my commands L`);
          break;
        }

        if (!carSetting || !carSetting.enabled) {
          await message.channel.send("❌ Car pictures are currently disabled in this server.");
          break;
        }

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        const embed = new EmbedBuilder()
          .setDescription(`Did someone mention ${cmd.toUpperCase()}, ${message.author}? 👀`)
          .setImage(randomGif)
          .setColor("#000000");
        await message.channel.send({ embeds: [embed] });
        break;
      }
    }
  },
};
