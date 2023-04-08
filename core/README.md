The main module.

![RevKit](https://raw.githubusercontent.com/Revolt-Unofficial-Clients/revkit/master/revkit-header.png)

[![npm](https://img.shields.io/npm/dt/revkit?label=Downloads&style=flat-square&color=ff4654)](https://www.npmjs.com/package/revkit)

#### Quick Example

```javascript
import { Client } from "revkit";

const bot = new Client();

bot.on("ready", () => {
  console.log(`${bot.user.username} is online!`);
});

bot.on("message", (message) => {
  if (message.isUser() && message.content == "!ping") {
    message.reply("pong");
  }
});

bot.login(process.env.TOKEN, "bot");
```
