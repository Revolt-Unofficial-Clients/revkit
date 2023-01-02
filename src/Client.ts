import axios from "axios";
import EventEmitter from "eventemitter3";
import FormData from "form-data";
import { API, DataCreateGroup, DataCreateServer, RevoltConfig } from "revolt-api";
import ChannelManager from "./managers/ChannelManager";
import EmojiManager from "./managers/EmoijManager";
import ServerManager from "./managers/ServerManager";
import UserManager from "./managers/UserManager";
import { AttachmentBucket } from "./objects/Attachment";
import AuthSession from "./objects/AuthSession";
import BaseMessage from "./objects/BaseMessage";
import { ClientboundNotification } from "./websocketNotifications";

export interface ClientOptions {
  apiURL: string;
  debug: boolean;
  heartbeat: number;
  reconnect: boolean;
  unreads: boolean;
  pingTimeout?: number;
  exitOnTimeout?: boolean;
}
const DefaultOptions: ClientOptions = {
  apiURL: "https://api.revolt.chat",
  debug: false,
  heartbeat: 30,
  reconnect: true,
  unreads: false,
};

export type ClientEvents =
  | "ready"
  | "connecting"
  | "connected"
  | "packet"
  | "message"
  | "messageUpdate"
  | "messageDelete";

export default class Client extends EventEmitter<ClientEvents> {
  public api: API;
  public options: ClientOptions;
  public config: RevoltConfig;
  public session: AuthSession;

  public channels: ChannelManager;
  public emojis: EmojiManager;
  public servers: ServerManager;
  public users: UserManager;

  public get user() {
    return this.users.self;
  }

  constructor(options?: Partial<ClientOptions>) {
    super();
    this.options = { ...DefaultOptions, ...options };

    this.channels = new ChannelManager(this);
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
  /** Create a new server. */
  public async createServer(data: DataCreateServer) {
    const { server, channels } = await this.api.post(`/servers/create`, data);
    return await this.servers.fetch(server._id, server, channels);
  }
  /** Create a new group. */
  async createGroup(data: DataCreateGroup) {
    const group = await this.api.post(`/channels/create`, data);
    return await this.channels.fetch(group._id, group);
  }

  public on(event: "ready", listener: () => any): this;
  public on(event: "connecting", listener: () => any): this;
  public on(event: "connected", listener: () => any): this;
  public on(event: "packet", listener: (packet: ClientboundNotification) => any): this;
  public on(event: "message", listener: (message: BaseMessage) => any): this;
  public on(event: "messageUpdate", listener: (message: BaseMessage) => any): this;
  public on(event: "messageDelete", listener: (id: string, message?: BaseMessage) => void): this;
  public on(event: ClientEvents, listener: (...args: any[]) => void, context?: any) {
    return super.on(event, listener, context);
  }

  /*
  on(event: "dropped", listener: () => void): this;
  on(event: "logout", listener: () => void): this;


  // General purpose event
  on(
    event: "message/updated",
    listener: (message: Message, packet: ClientboundNotification) => void
  ): this;

  on(event: "channel/create", listener: (channel: Channel) => void): this;
  on(event: "channel/update", listener: (channel: Channel) => void): this;
  on(event: "channel/delete", listener: (id: string, channel?: Channel) => void): this;

  on(event: "server/update", listener: (server: Server) => void): this;
  on(event: "server/delete", listener: (id: string, server?: Server) => void): this;

  on(event: "role/update", listener: (roleId: string, role: Role, serverId: string) => void): this;
  on(event: "role/delete", listener: (id: string, serverId: string) => void): this;

  on(event: "member/join", listener: (member: Member) => void): this;
  on(event: "member/update", listener: (member: Member) => void): this;
  on(event: "member/leave", listener: (id: MemberCompositeKey) => void): this;

  on(event: "user/relationship", listener: (user: User) => void): this;

  on(event: "emoji/create", listener: (emoji: Emoji) => void): this;
  on(event: "emoji/delete", listener: (id: string, emoji?: Emoji) => void): this;*/
}
