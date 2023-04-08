const { Client } = require("revkit");
const { default: VoiceClient } = require("../dist/cjs/node.js");
const { createReadStream } = require("fs");

const token = process.argv[2];

if (!token) {
  console.error("Must include a token as first argument!");
  process.exit();
}

const bot = new Client(),
  voice = new VoiceClient(bot);

bot.on("message", async (message) => {
  if (!message.isUser() || !message.server) return;
  if (message.content.startsWith("!play")) {
    const channel = message.server.channels.find((c) =>
      c.name.toLowerCase().includes(message.content.slice("!play".length).trim().toLowerCase())
    );
    if (!channel || message.content.trim().length <= "!play".length)
      return message.reply("Invalid channel.");
    await voice.connect(channel);
    await voice.play("audio", createReadStream("./sample.mp3"));
    message.reply("Playing audio.");
  }
  if (message.content.startsWith("!leave")) {
    voice.disconnect();
  }
  if (message.content.startsWith("!stop")) {
    voice.stopProduce("audio");
  }
});

bot.on("ready", () => {
  console.log("Bot online. " + bot.user.username);
});

bot.login(token, "bot");
