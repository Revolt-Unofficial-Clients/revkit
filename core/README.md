The main module.

![RevKit](https://raw.githubusercontent.com/Revolt-Unofficial-Clients/revkit/master/revkit-header.png)

#### Quick Example

```js
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
