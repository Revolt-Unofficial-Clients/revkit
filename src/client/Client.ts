import EventEmitter from "eventemitter3";
import { API, RevoltConfig } from "revolt-api";
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
  public api: API;
  public options: ClientOptions;
  public config: RevoltConfig;

  constructor(options?: Partial<ClientOptions>) {
    super();
    this.options = { ...DefaultOptions, ...options };

    this.emojis = new EmojiManager(this);

    this.api = new API({ baseURL: this.options.apiURL });
  }

  public async fetchConfiguration(force = false) {
    if (!this.config || force) this.config = await this.api.get("/");
  }
}
