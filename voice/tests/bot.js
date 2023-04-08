const { Client } = require("revkit");
const { default: VoiceClient } = require("../dist/cjs/node.js");
const { createReadStream, createWriteStream } = require("fs");
require("dotenv").config();

const bot = new Client(),
  voice = new VoiceClient(bot);

voice.on("error", console.error);

bot.on("message", async (message) => {
  if (!message.isUser() || !message.server) return;
  if (message.content?.startsWith("!play")) {
    const channel = message.server.channels.find(
      (c) =>
        c.isVoice() &&
        c.name.toLowerCase().includes(message.content.slice("!play".length).trim().toLowerCase())
    );
    if (!channel || message.content.trim().length <= "!play".length)
      return message.reply("Invalid channel.");
    await voice.connect(channel);
    const str = createReadStream("sample.mp3");
    await voice.play("audio", str);
    message.reply("Playing audio.");
  }
  if (message.content?.startsWith("!join")) {
    const channel = message.server.channels.find(
      (c) =>
        c.isVoice() &&
        c.name.toLowerCase().includes(message.content.slice("!join".length).trim().toLowerCase())
    );
    if (!channel || message.content.trim().length <= "!join".length)
      return message.reply("Invalid channel.");
    await voice.connect(channel);
    message.reply("ok");
  }
  if (message.content?.startsWith("!leave")) {
    voice.disconnect();
    message.reply("ok");
  }
  if (message.content?.startsWith("!stop")) {
    await voice.stopProduce("audio");
    message.reply("ok");
  }
});

bot.on("ready", () => {
  console.log("Bot online. " + bot.user.username);
});

voice.on("userStartProduce", async (part, type) => {
  if (type !== "audio") return;
  const incoming = await voice.listenTo(part, "audio");
  if (!incoming) return console.error("No incoming stream for " + part.user.username);
  const file = createWriteStream(`${part.user.username}-audio.mp3`);
  incoming.pipe(file);
  file.on("close", () => {
    console.log("closed");
  });
});

bot.login(process.env.TOKEN, "bot");
