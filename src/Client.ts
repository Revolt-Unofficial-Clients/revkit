import axios from "axios";
import EventEmitter from "eventemitter3";
import FormData from "form-data";
import { API, RevoltConfig } from "revolt-api";
import EmojiManager from "./managers/EmoijManager";
import ServerManager from "./managers/ServerManager";
import UserManager from "./managers/UserManager";
import { AttachmentBucket } from "./objects/Attachment";

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
  public api: API;
  public options: ClientOptions;
  public config: RevoltConfig;

  public emojis: EmojiManager;
  public servers: ServerManager;
  public users: UserManager;

  public get user() {
    return this.users.self;
  }

  constructor(options?: Partial<ClientOptions>) {
    super();
    this.options = { ...DefaultOptions, ...options };

    this.emojis = new EmojiManager(this);
    this.servers = new ServerManager(this);
    this.users = new UserManager(this);

    this.api = new API({ baseURL: this.options.apiURL });
  }

  public async fetchConfiguration(force = false) {
    if (!this.config || force) this.config = await this.api.get("/");
  }

  /** Upload an attachment to Autumn. */
  public async uploadAttachment(
    filename: string,
    data: Buffer | Blob,
    type: AttachmentBucket = "attachments"
  ): Promise<string> {
    await this.fetchConfiguration();
    if (!this.config.features.autumn.enabled) throw "Autumn is not enabled!";
    const form = new FormData();
    form.append("file", data, filename);
    const res = await axios.post(`${this.config.features.autumn.url}/${type}`, form, {
      headers: form.getHeaders?.() || {},
      data: form,
    });
    return res.data?.id;
  }
}
