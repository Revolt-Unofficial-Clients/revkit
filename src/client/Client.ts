import EventEmitter from "eventemitter3";
import EmojiManager from "./managers/EmoijManager";

export interface ClientOptions {
  apiURL: string;
  debug: boolean;
  heartbeat: number;
  pingTimeout?: boolean;
  reconnect: boolean;
  unreads: boolean;
}
const DefaultOptions: ClientOptions = {
  apiURL: "https://api.revolt.chat",
  debug: false,
  heartbeat: 30,
  reconnect: true,
  unreads: false,
};

export default class Client extends EventEmitter {
  public emojis: EmojiManager;

  constructor(options?: Partial<ClientOptions>) {
    super();
    options = { ...DefaultOptions, ...options };

    this.emojis = new EmojiManager(this);
  }
}
