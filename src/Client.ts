import axios from "axios";
import EventEmitter from "eventemitter3";
import FormData from "form-data";
import { API, DataCreateGroup, DataCreateServer, DataLogin, Emoji, RevoltConfig } from "revolt-api";
import { ChannelManager } from "./managers/ChannelManager";
import { EmojiManager } from "./managers/EmoijManager";
import { ServerManager } from "./managers/ServerManager";
import { UserManager } from "./managers/UserManager";
import { AttachmentBucket } from "./objects/Attachment";
import { BaseMessage } from "./objects/BaseMessage";
import { Channel } from "./objects/Channel";
import { GroupDMChannel } from "./objects/GroupDMChannel";
import { Member } from "./objects/Member";
import { Role } from "./objects/Role";
import { Server } from "./objects/Server";
import { User } from "./objects/User";
import { WebSocketClient } from "./websocket";
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
  | "disconnected"
  | "packet"
  | "channelCreate"
  | "channelUpdate"
  | "channelDelete"
  | "emojiCreate"
  | "emojiDelete"
  | "groupMemberJoin"
  | "groupMemberLeave"
  | "groupExited"
  | "message"
  | "messageUpdate"
  | "messageDelete"
  | "serverCreate"
  | "serverUpdate"
  | "serverExited"
  | "serverMemberJoin"
  | "serverMemberLeave"
  | "serverMemberUpdate"
  | "serverRoleCreate"
  | "serverRoleUpdate"
  | "serverRoleDelete"
  | "userRelationshipUpdate"
  | "userUpdate";

export class Client extends EventEmitter<ClientEvents> {
  public api: API;
  public options: ClientOptions;
  public config: RevoltConfig;
  public session: { token: string; type: "user" | "bot" };
  public ws: WebSocketClient;

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
    this.ws = new WebSocketClient(this);
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
  public async createGroup(data: DataCreateGroup) {
    const group = await this.api.post(`/channels/create`, data);
    return await this.channels.fetch(group._id, group);
  }

  /** Log in using an existing session or bot token. */
  public async login(token: string, type: "user" | "bot") {
    await this.fetchConfiguration();
    this.session = { token, type };
    this.api = new API({
      baseURL: this.options.apiURL,
      authentication: {
        revolt: type == "user" ? { token } : token,
      },
    });
    await this.ws.connect();
  }
  /**
   * Log in with a username and password.
   * @returns Nothing on success, an onboarding function, or 2FA when implemented.
   */
  public async authenticate(details: DataLogin) {
    await this.fetchConfiguration();
    const data = await this.api.post("/auth/session/login", details);
    if (data.result === "Success") {
      const { onboarding } = await this.api.get("/onboard/hello");
      if (onboarding) {
        const that = this;
        return async (username: string, loginAfterSuccess = true) => {
          await that.api.post("/onboard/complete", { username });
          if (loginAfterSuccess) await that.login(data.token, "user");
        };
      }
      this.login(data.token, "user");
      return;
    } else {
      throw "MFA not implemented!";
    }
  }

  public on(event: "ready", listener: () => any): this;
  public on(event: "connecting", listener: () => any): this;
  public on(event: "connected", listener: () => any): this;
  public on(event: "disconnected", listener: () => any): this;
  public on(event: "packet", listener: (packet: ClientboundNotification) => any): this;
  public on(event: "channelCreate", listener: (channel: Channel) => any): this;
  public on(event: "channelUpdate", listener: (channel: Channel) => any): this;
  public on(event: "channelDelete", listener: (id: string, channel?: Channel) => any): this;
  public on(event: "emojiCreate", listener: (emoji: Emoji) => void): this;
  public on(event: "emojiDelete", listener: (id: string, emoji?: Emoji) => void): this;
  public on(event: "groupMemberJoin", listener: (group: GroupDMChannel, user: User) => any): this;
  public on(event: "groupMemberLeave", listener: (group: GroupDMChannel, user: User) => any): this;
  public on(event: "groupExited", listener: (group: GroupDMChannel) => any): this;
  public on(event: "message", listener: (message: BaseMessage) => any): this;
  public on(event: "messageUpdate", listener: (message: BaseMessage) => any): this;
  public on(event: "messageDelete", listener: (id: string, message?: BaseMessage) => any): this;
  public on(event: "serverCreate", listener: (server: Server) => any): this;
  public on(event: "serverUpdate", listener: (server: Server) => any): this;
  public on(event: "serverExited", listener: (id: string, server?: Server) => any): this;
  public on(event: "serverMemberJoin", listener: (member: Member) => any): this;
  public on(event: "serverMemberLeave", listener: (server: Server, user: User) => any): this;
  public on(event: "serverMemberUpdate", listener: (member: Member) => any): this;
  public on(event: "serverRoleCreate", listener: (role: Role) => any): this;
  public on(event: "serverRoleUpdate", listener: (role: Role) => any): this;
  public on(event: "serverRoleDelete", listener: (role: Role) => any): this;
  public on(event: "userRelationshipUpdate", listener: (user: User) => any): this;
  public on(event: "userUpdate", listener: (user: User) => any): this;
  public on(event: ClientEvents, listener: (...args: any[]) => void, context?: any) {
    return super.on(event, listener, context);
  }

  /*
  on(event: "logout", listener: () => void): this;
  */
}
