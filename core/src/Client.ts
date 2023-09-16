import axios from "axios";
import EventEmitter from "eventemitter3";
import FormData from "form-data";
import {
  API,
  DataChangeUsername,
  DataCreateGroup,
  DataCreateServer,
  DataEditUser,
  DataLogin,
  Emoji,
  MFAMethod,
  MFAResponse,
  RevoltConfig,
} from "revolt-api";
import { ulid } from "ulid";
import { ChannelManager } from "./managers/ChannelManager";
import { EmojiManager } from "./managers/EmojiManager";
import { ServerManager } from "./managers/ServerManager";
import { UnreadManager } from "./managers/UnreadManager";
import { UserManager } from "./managers/UserManager";
import { AttachmentBucket } from "./objects/Attachment";
import { BaseMessage } from "./objects/BaseMessage";
import { Channel } from "./objects/Channel";
import { GlobalInvite } from "./objects/GlobalInvite";
import { GroupDMChannel } from "./objects/GroupDMChannel";
import { Member } from "./objects/Member";
import { Role } from "./objects/Role";
import { Server } from "./objects/Server";
import { ServerInvite } from "./objects/ServerInvite";
import { User } from "./objects/User";
import { AutumnConfig, JanuaryConfig, VortexConfig } from "./utils/ServiceConfig";
import { WebSocketClient } from "./websocket";
import { ClientboundNotification } from "./websocketNotifications";

export interface ClientOptions {
  apiURL: string;
  debug: boolean;
  heartbeat: number;
  reconnect: boolean;
  pingTimeout?: number;
  exitOnTimeout?: boolean;
}
const DefaultOptions: ClientOptions = {
  apiURL: "https://api.revolt.chat",
  debug: false,
  heartbeat: 30,
  reconnect: true,
};

export interface ClientSession {
  id: string;
  name: string;
  token: string;
  type: "user" | "bot";
}
export type ClientEvents =
  | "ready"
  | "connecting"
  | "connected"
  | "disconnected"
  | "destroyed"
  | "packet"
  | "channelCreate"
  | "channelUpdate"
  | "channelDelete"
  | "channelStartTyping"
  | "channelStopTyping"
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
  public session: ClientSession;
  public ws: WebSocketClient;

  public channels: ChannelManager;
  public emojis: EmojiManager;
  public servers: ServerManager;
  public unreads: UnreadManager;
  public users: UserManager;

  public get user() {
    return this.users.self;
  }

  constructor(options?: Partial<ClientOptions>) {
    super();
    this.options = { ...DefaultOptions, ...options };
    this.setup();

    this.api = new API({ baseURL: this.options.apiURL });
    this.ws = new WebSocketClient(this);
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
  /** Proxies a file URL through january. (if enabled) */
  public proxyFile(url: string): string | null {
    if (this.config?.features.january.enabled) {
      return `${this.config.features.january.url}/proxy?url=${encodeURIComponent(url)}`;
    } else return null;
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
  /** Edit the client User's profile information. */
  public async editUser(details: DataEditUser) {
    return this.user.update(await this.api.patch("/users/@me", details));
  }
  /** Change the client User's username. */
  public async changeUsername(details: DataChangeUsername) {
    return this.user.update(await this.api.patch("/users/@me/username", details));
  }

  /** Fetch an existing invite. */
  public async fetchInvite(code: string) {
    const invite = await this.api.get(`/invites/${<"">code}`);
    return new GlobalInvite(this, { _id: invite.code, ...invite });
  }
  /** Accept an invite. (Group DMs not supported yet) */
  public async acceptInvite(
    invite: string | GlobalInvite | ServerInvite
  ): Promise<Server | GroupDMChannel> {
    if (typeof invite !== "string") {
      switch (invite.type) {
        case "Group": {
          const group = this.channels.get(invite.channel.id);
          if (group?.isGroupDM()) return group;
          break;
        }
        case "Server": {
          const server = this.servers.get(invite.server.id);
          if (server) return server;
        }
      }
    }

    const response = await this.api.post(
      `/invites/${typeof invite == "string" ? invite : invite.id}`
    );
    if (response.type === "Server") {
      return await this.servers.fetch(response.server._id, response.server, response.channels);
    } else {
      return null;
    }
  }

  /** Log in using an existing session or bot token. */
  public async login(
    token: string,
    type: "user" | "bot",
    connect = true,
    details?: Partial<Omit<Omit<ClientSession, "token">, "type">>
  ) {
    this.session = { token, type, id: details?.id || ulid(), name: details?.name || "" };
    this.api = new API({
      baseURL: this.options.apiURL,
      authentication: {
        revolt: type == "user" ? { token } : token,
      },
    });
    await this.fetchConfiguration();
    if (connect) await this.ws.connect();
  }
  /**
   * Log in with a username and password.
   * @returns Returns a response being one of `none`, `onboard`, or `mfa`. Onboarding and MFA both require a response.
   */
  public async authenticate(details: DataLogin): Promise<
    | { type: "none" }
    | {
        type: "onboard";
        respond(username: string, loginAfterSuccess: boolean): Promise<void>;
      }
    | {
        type: "mfa";
        ticket: string;
        methods: MFAMethod[];
        respond(totp_code: string): ReturnType<Client["authenticate"]>;
      }
  > {
    await this.fetchConfiguration();
    const client = this;
    const data = await this.api.post("/auth/session/login", details);
    if (data.result === "Success") {
      await this.login(data.token, "user", false);
      const { onboarding } = await this.api.get("/onboard/hello");
      if (onboarding) {
        return {
          type: "onboard",
          async respond(username: string, loginAfterSuccess = true) {
            await client.api.post("/onboard/complete", { username });
            if (loginAfterSuccess)
              await client.login(data.token, "user", true, { name: data.name, id: data._id });
          },
        };
      }
      await this.login(data.token, "user", true, { name: data.name, id: data._id });
      return { type: "none" };
    } else if (data.result == "MFA") {
      return {
        type: "mfa",
        ticket: data.ticket,
        methods: data.allowed_methods,
        async respond(totp_code: string) {
          return await client.authenticate({
            mfa_ticket: data.ticket,
            mfa_response: { totp_code },
            friendly_name: details.friendly_name,
          });
        },
      };
    }
  }

  public get mfa() {
    const client = this;
    function ticketHeaders(token: string) {
      return {
        headers: {
          "X-MFA-Ticket": token,
        },
      };
    }
    const man = {
      /** MFA status. */
      async status() {
        const status = await client.api.get("/auth/mfa/");
        return {
          hasRecovery: status.recovery_active,
        };
      },
      /** Allowed ticket methods for account. */
      async allowedMethods() {
        return await client.api.get("/auth/mfa/methods");
      },
      /** Generate an MFA ticket for later use. */
      async generateTicket(code: MFAResponse) {
        const ticket = await client.api.put("/auth/mfa/ticket", code);
        return {
          id: ticket._id,
          accountID: ticket.account_id,
          token: ticket.token,
          validated: ticket.validated,
          authorized: !!ticket.authorised,
          lastTOTPCode: ticket.last_totp_code ?? null,
        };
      },
      /** Generate the TOTP secret for MFA app. */
      async generateTOTPSecret(ticketToken: string) {
        return (await client.api.post("/auth/mfa/totp", undefined, ticketHeaders(ticketToken)))
          .secret;
      },
      /** Enable TOTP with the code from MFA app. */
      async enableTOTP(ticketToken: string, totp_code: string) {
        return await client.api.put("/auth/mfa/totp", { totp_code }, ticketHeaders(ticketToken));
      },
      /** Disable TOTP. */
      async disableTOTP(ticketToken: string) {
        await client.api.delete("/auth/mfa/totp", {}, ticketHeaders(ticketToken));
      },
      /** Fetch recovery codes. (or generate/enable them if not enabled) */
      async fetchRecoveryCodes(ticketToken: string) {
        const status = await man.status();
        if (status.hasRecovery)
          return await client.api.post("/auth/mfa/recovery", undefined, ticketHeaders(ticketToken));
        else return await man.generateRecoveryCodes(ticketToken);
      },
      /** Generate new recovery codes. */
      async generateRecoveryCodes(ticketToken: string) {
        return await client.api.patch("/auth/mfa/recovery", undefined, ticketHeaders(ticketToken));
      },
    };
    return man;
  }

  /** Compatibility layer. Do not use in prod. */
  async syncFetchSettings(keys: string[]) {
    return await this.api.post("/sync/settings/fetch", { keys });
  }
  /** Compatibility layer. Do not use in prod. */
  async syncSetSettings(data: { [key: string]: object | string }, timestamp?: number) {
    const requestData: { [key: string]: string } = {};
    for (const key of Object.keys(data)) {
      const value = data[key];
      requestData[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
    await this.api.post(`/sync/settings/set`, {
      ...requestData,
      timestamp,
    });
  }

  public async fetchConfiguration(force = false) {
    if (!this.config || force) this.config = await this.api.get("/");
  }
  public async fetchAutumnConfiguration(): Promise<AutumnConfig | null> {
    await this.fetchConfiguration();
    if (!this.config.features.autumn.enabled) return null;
    return (await axios.get(this.config.features.autumn.url)).data;
  }
  public async fetchJanuaryConfiguration(): Promise<JanuaryConfig | null> {
    await this.fetchConfiguration();
    if (!this.config.features.january.enabled) return null;
    return (await axios.get(this.config.features.january.url)).data;
  }
  public async fetchVortexConfiguration(): Promise<VortexConfig | null> {
    await this.fetchConfiguration();
    if (!this.config.features.voso.enabled) return null;
    return (await axios.get(this.config.features.voso.url)).data;
  }
  public setup() {
    this.channels = new ChannelManager(this);
    this.emojis = new EmojiManager(this);
    this.servers = new ServerManager(this);
    this.unreads = new UnreadManager(this);
    this.users = new UserManager(this);
  }
  public async destroy(destroySession = false) {
    this.emit("destroyed");
    if (destroySession) await this.api.post("/auth/session/logout");
    this.ws.disconnect();
    delete this.session;
    this.setup();
  }

  public on(event: "ready", listener: () => any): this;
  public on(event: "connecting", listener: () => any): this;
  public on(event: "connected", listener: () => any): this;
  public on(event: "disconnected", listener: () => any): this;
  public on(event: "destroyed", listener: () => any): this;
  public on(event: "packet", listener: (packet: ClientboundNotification) => any): this;
  public on(event: "channelCreate", listener: (channel: Channel) => any): this;
  public on(event: "channelUpdate", listener: (channel: Channel) => any): this;
  public on(event: "channelDelete", listener: (id: string, channel?: Channel) => any): this;
  public on(event: "channelStartTyping", listener: (user: User, channel: Channel) => any): this;
  public on(event: "channelStopTyping", listener: (user: User, channel: Channel) => any): this;
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

  //TODO: find a better way
  public once(event: "ready", listener: () => any): this;
  public once(event: "connecting", listener: () => any): this;
  public once(event: "connected", listener: () => any): this;
  public once(event: "disconnected", listener: () => any): this;
  public once(event: "destroyed", listener: () => any): this;
  public once(event: "packet", listener: (packet: ClientboundNotification) => any): this;
  public once(event: "channelCreate", listener: (channel: Channel) => any): this;
  public once(event: "channelUpdate", listener: (channel: Channel) => any): this;
  public once(event: "channelDelete", listener: (id: string, channel?: Channel) => any): this;
  public once(event: "channelStartTyping", listener: (user: User, channel: Channel) => any): this;
  public once(event: "channelStopTyping", listener: (user: User, channel: Channel) => any): this;
  public once(event: "emojiCreate", listener: (emoji: Emoji) => void): this;
  public once(event: "emojiDelete", listener: (id: string, emoji?: Emoji) => void): this;
  public once(event: "groupMemberJoin", listener: (group: GroupDMChannel, user: User) => any): this;
  public once(
    event: "groupMemberLeave",
    listener: (group: GroupDMChannel, user: User) => any
  ): this;
  public once(event: "groupExited", listener: (group: GroupDMChannel) => any): this;
  public once(event: "message", listener: (message: BaseMessage) => any): this;
  public once(event: "messageUpdate", listener: (message: BaseMessage) => any): this;
  public once(event: "messageDelete", listener: (id: string, message?: BaseMessage) => any): this;
  public once(event: "serverCreate", listener: (server: Server) => any): this;
  public once(event: "serverUpdate", listener: (server: Server) => any): this;
  public once(event: "serverExited", listener: (id: string, server?: Server) => any): this;
  public once(event: "serverMemberJoin", listener: (member: Member) => any): this;
  public once(event: "serverMemberLeave", listener: (server: Server, user: User) => any): this;
  public once(event: "serverMemberUpdate", listener: (member: Member) => any): this;
  public once(event: "serverRoleCreate", listener: (role: Role) => any): this;
  public once(event: "serverRoleUpdate", listener: (role: Role) => any): this;
  public once(event: "serverRoleDelete", listener: (role: Role) => any): this;
  public once(event: "userRelationshipUpdate", listener: (user: User) => any): this;
  public once(event: "userUpdate", listener: (user: User) => any): this;
  public once(event: ClientEvents, listener: (...args: any[]) => void, context?: any) {
    return super.once(event, listener, context);
  }
}
