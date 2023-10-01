// The two @insertish packages add ESM support (as far as I can tell)
import { backOff } from "@insertish/exponential-backoff";
import WebSocket from "@insertish/isomorphic-ws";
import type { MessageEvent } from "ws";
import { Client } from "./Client";
import { DEAD_ID } from "./api";
import { ClientboundNotification, ServerboundNotification } from "./websocketNotifications";

// Shamelessly copied from revolt.js
export class WebSocketClient {
  public ws?: WebSocket;

  private heartbeat?: NodeJS.Timer;
  public connected = false;
  public ready = false;

  public ping?: number;

  constructor(public client: Client) {}

  /** Disconnect the WebSocket and disable heartbeats. */
  public disconnect() {
    clearInterval(this.heartbeat);
    this.connected = this.ready = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();
  }

  /** Send a notification to the server. */
  public send(notification: ServerboundNotification) {
    if (typeof this.ws === "undefined" || this.ws.readyState !== WebSocket.OPEN) return;
    const data = JSON.stringify(notification);
    if (this.client.options.debug) console.debug("[<<] Outgoing Packet", data);
    this.ws.send(data);
  }

  /** Connect to the server. */
  public connect(disallowReconnect?: boolean): Promise<void> {
    this.client.emit("connecting");

    return new Promise((resolve, $reject) => {
      let thrown = false;
      const reject = (err: unknown) => {
        if (!thrown) {
          thrown = true;
          $reject(err);
        }
      };
      this.disconnect();

      if (!this.client.config)
        throw new Error("Attempted to open WebSocket without syncing configuration from server.");
      if (!this.client.session)
        throw new Error("Attempted to open WebSocket without valid session.");

      this.ws = new WebSocket(this.client.config.ws);
      this.ws.onopen = () =>
        this.send({
          type: "Authenticate",
          token: this.client.session.token,
        });

      const process = async (packet: ClientboundNotification) => {
        this.client.emit("packet", packet);
        try {
          switch (packet.type) {
            case "Bulk": {
              for (const entry of packet.v) {
                await process(entry);
              }
              break;
            }
            case "Error": {
              reject(packet.error);
              break;
            }
            case "Authenticated": {
              disallowReconnect = false;
              this.client.emit("connected");
              this.connected = true;
              break;
            }
            case "Ready": {
              if (packet.type !== "Ready") throw 0;
              for (const user of packet.users) {
                this.client.users.construct(user);
              }
              for (const channel of packet.channels) {
                this.client.channels.construct(channel);
              }
              for (const server of packet.servers) {
                this.client.servers.construct(server);
              }
              for (const member of packet.members) {
                this.client.servers.get(member._id.server)?.members.construct(member);
              }
              if (packet.emojis)
                for (const emoji of packet.emojis!) {
                  this.client.emojis.construct(emoji);
                }

              this.client.emit("ready");
              this.ready = true;
              resolve();

              this.client.unreads.sync();

              if (this.client.options.heartbeat > 0) {
                this.send({ type: "Ping", data: +new Date() });
                this.heartbeat = setInterval(() => {
                  this.send({
                    type: "Ping",
                    data: +new Date(),
                  });
                  if (this.client.options.pingTimeout) {
                    let pongReceived = false;

                    this.client.once("packet", (p) => {
                      if (p.type == "Pong") pongReceived = true;
                    });

                    setTimeout(() => {
                      if (!pongReceived) {
                        if (this.client.options.exitOnTimeout) {
                          throw "Client did not receive a pong in time.";
                        } else {
                          console.warn(
                            "Warning: Client did not receive a pong in time. Reconnecting."
                          );

                          this.disconnect();
                          this.connect(disallowReconnect);
                        }
                      }
                    }, this.client.options.pingTimeout * 1000);
                  }
                }, this.client.options.heartbeat * 1000);
              }
              break;
            }

            case "Message": {
              if (packet.author === DEAD_ID) {
                if (packet.system) {
                  switch (packet.system.type) {
                    case "user_added":
                    case "user_remove":
                      await this.client.users.fetch(packet.system.by);
                      break;
                    case "user_joined":
                      await this.client.users.fetch(packet.system.id);
                      break;
                    case "channel_description_changed":
                    case "channel_icon_changed":
                    case "channel_renamed":
                      await this.client.users.fetch(packet.system.by);
                      break;
                  }
                }
              } else {
                await this.client.users.fetch(packet.author);
              }

              const channel = await this.client.channels.fetch(packet.channel);
              if (channel.isServerBased()) {
                const server = await this.client.servers.fetch(channel.serverID);
                if (packet.author !== DEAD_ID) await server.members.fetch(packet.author);
              }

              const message = channel.messages.construct(packet);
              if (channel.isDM()) {
                channel.update({ active: true });
              }
              channel.update({ last_message_id: message.id });

              this.client.emit("message", message);

              if (message.isUser() && message.mentionIDs.includes(this.client.user.id))
                this.client.unreads.markMention(message);
              break;
            }
            case "MessageUpdate": {
              const channel = this.client.channels.get(packet.channel),
                message = channel?.messages.get(packet.id);
              if (message) {
                message.update(packet.data);
                this.client.emit("messageUpdate", message);
              }
              break;
            }
            case "MessageAppend": {
              const channel = this.client.channels.get(packet.channel),
                message = channel?.messages.get(packet.id);
              if (message?.isUser()) {
                message.appendEmbed(packet.append);
                this.client.emit("messageUpdate", message);
              }
              break;
            }
            case "MessageDelete": {
              const channel = this.client.channels.get(packet.channel);
              if (channel) {
                const message = channel.messages.get(packet.id);
                channel.messages.delete(packet.id);
                this.client.emit("messageDelete", packet.id, message);
              }
              break;
            }
            case "MessageReact": {
              const channel = this.client.channels.get(packet.channel_id),
                message = channel?.messages.get(packet.id);
              if (message) {
                message.update({
                  reactions: {
                    ...message.source.reactions,
                    [packet.emoji_id]: [
                      ...new Set([
                        ...(message.source.reactions?.[packet.emoji_id] || []),
                        packet.user_id,
                      ]),
                    ],
                  },
                });
                this.client.emit("messageUpdate", message);
              }
              break;
            }
            case "MessageUnreact": {
              const channel = this.client.channels.get(packet.channel_id),
                message = channel?.messages.get(packet.id);
              if (message) {
                const ids = message.source.reactions?.[packet.emoji_id];
                if (ids) {
                  const r = new Set(ids);
                  r.delete(packet.user_id);
                  if (!r.size) {
                    delete message.source.reactions[packet.emoji_id];
                    message.update({ reactions: message.source.reactions });
                  } else {
                    message.update({
                      reactions: {
                        ...message.source.reactions,
                        [packet.emoji_id]: [...r],
                      },
                    });
                  }
                }
                this.client.emit("messageUpdate", message);
              }
              break;
            }
            case "MessageRemoveReaction": {
              const channel = this.client.channels.get(packet.channel_id),
                message = channel?.messages.get(packet.id);
              if (message) {
                delete message.source.reactions[packet.emoji_id];
                message.update({ reactions: message.source.reactions });
                this.client.emit("messageUpdate", message);
              }
              break;
            }
            case "BulkMessageDelete": {
              const channel = this.client.channels.get(packet.channel);
              if (channel) {
                for (const id of packet.ids) {
                  const message = channel.messages.get(id);
                  channel.messages.delete(id);
                  this.client.emit("messageDelete", id, message);
                }
              }
              break;
            }
            case "ChannelCreate": {
              if (packet.channel_type === "TextChannel" || packet.channel_type === "VoiceChannel") {
                const server = await this.client.servers.fetch(packet.server);
                server.update({ channels: [...(server.source.channels || []), packet._id] });
              }
              this.client.emit("channelCreate", this.client.channels.construct(packet));
              break;
            }
            case "ChannelUpdate": {
              const channel = this.client.channels.get(packet.id);
              if (channel) {
                packet.clear?.forEach((c) => delete channel.source[c]);
                this.client.emit("channelUpdate", channel.update(packet.data));
              }
              break;
            }
            case "ChannelDelete": {
              const channel = this.client.channels.get(packet.id);
              this.client.channels.delete(packet.id);
              this.client.emit("channelDelete", packet.id, channel);
              break;
            }
            case "ChannelGroupJoin": {
              const channel = this.client.channels.get(packet.id);
              if (channel?.isGroupDM()) {
                const user = await this.client.users.fetch(packet.user);
                if (user) {
                  const r = new Set(channel.source.recipients);
                  r.add(packet.user);
                  channel.update({ recipients: [...r] });
                  this.client.emit("groupMemberJoin", channel, user);
                }
              }
              break;
            }
            case "ChannelGroupLeave": {
              const channel = this.client.channels.get(packet.id);
              if (channel?.isGroupDM()) {
                if (packet.user === this.client.user.id) {
                  this.client.channels.delete(channel.id);
                  this.client.emit("groupExited", channel);
                } else {
                  const user = await this.client.users.fetch(packet.user);
                  if (user) {
                    const r = new Set(channel.source.recipients);
                    r.delete(packet.user);
                    channel.update({ recipients: [...r] });
                    this.client.emit("groupMemberLeave", channel, user);
                  }
                }
              }
              break;
            }
            case "ServerCreate": {
              for (const channel of packet.channels) {
                await this.client.channels.fetch(channel._id, channel);
              }
              this.client.emit(
                "serverCreate",
                await this.client.servers.fetch(packet.id, packet.server)
              );
              break;
            }
            case "ServerUpdate": {
              const server = await this.client.servers.fetch(packet.id);
              if (server) {
                packet.clear?.forEach((c) => delete server.source[c]);
                this.client.emit("serverUpdate", server.update(packet.data));
              }
              break;
            }
            case "ServerDelete": {
              const server = this.client.servers.get(packet.id);
              this.client.servers.delete(packet.id);
              this.client.emit("serverExited", packet.id, server);
              break;
            }
            case "ServerMemberJoin": {
              const server = await this.client.servers.fetch(packet.id);
              await this.client.users.fetch(packet.user);
              this.client.emit(
                "serverMemberJoin",
                server.members.construct({
                  _id: {
                    server: packet.id,
                    user: packet.user,
                  },
                  joined_at: new Date().toISOString(),
                })
              );
              break;
            }
            case "ServerMemberLeave": {
              const server = this.client.servers.get(packet.id);
              if (packet.user == this.client.user.id) {
                this.client.servers.delete(packet.id);
                this.client.emit("serverExited", packet.id, server);
              } else {
                server.members.delete(packet.id);
                this.client.emit(
                  "serverMemberLeave",
                  server,
                  await this.client.users.fetch(packet.id)
                );
              }
              break;
            }
            case "ServerMemberUpdate": {
              const server = await this.client.servers.fetch(packet.id.server),
                member = server.members.get(packet.id.user);
              if (member) {
                packet.clear?.forEach((c) => delete member.source[c]);
                this.client.emit("serverMemberUpdate", member.update(packet.data));
              }
              break;
            }
            case "ServerRoleUpdate": {
              const server = await this.client.servers.fetch(packet.id);
              if (server) {
                const isNew = !server.roles.get(packet.role_id);
                server.update({
                  roles: {
                    ...server.source.roles,
                    [packet.role_id]: {
                      ...server.source.roles?.[packet.role_id],
                      ...packet.data,
                    },
                  },
                });
                this.client.emit(
                  isNew ? "serverRoleCreate" : "serverRoleUpdate",
                  server.roles.get(packet.role_id)
                );
              }
              break;
            }
            case "ServerRoleDelete": {
              const server = await this.client.servers.fetch(packet.id);
              if (server) {
                const role = server.roles.get(packet.role_id);
                if (role) {
                  delete server.source.roles?.[packet.role_id];
                  server.update({ roles: server.source.roles });
                  this.client.emit("serverRoleDelete", role);
                }
              }
              break;
            }
            case "UserUpdate": {
              const user = this.client.users.get(packet.id);
              if (user) {
                packet.clear?.forEach((c) => delete user.source[c]);
                user.update(packet.data);
                this.client.emit("userUpdate", user);
              }
              break;
            }
            case "UserRelationship": {
              const user = this.client.users.get(packet.user._id);
              if (user) {
                user.update({
                  ...packet.user,
                  relationship: packet.status,
                });
                this.client.emit("userRelationshipUpdate", user);
              } else {
                this.client.emit(
                  "userRelationshipUpdate",
                  this.client.users.construct(packet.user)
                );
              }
              break;
            }
            case "EmojiCreate": {
              this.client.emit("emojiCreate", this.client.emojis.construct(packet));
              break;
            }
            case "EmojiDelete": {
              const emoji = this.client.emojis.get(packet.id);
              this.client.emojis.delete(packet.id);
              this.client.emit("emojiDelete", packet.id, emoji);
              break;
            }
            case "ChannelAck": {
              const channel = this.client.channels.get(packet.id);
              if (channel) this.client.unreads.markRead(channel, packet.message_id, false);
              break;
            }
            case "ChannelStartTyping": {
              const channel = this.client.channels.get(packet.id),
                user = await this.client.users.fetch(packet.user);
              if (channel && user) {
                channel.typingIDs.add(user.id);
                clearTimeout(timeouts[channel.id + user.id]);
                timeouts[channel.id + user.id] = setTimeout(() => {
                  channel.typingIDs.delete(user.id);
                }, 3000);
                this.client.emit("channelStartTyping", user, channel);
              }
              break;
            }
            case "ChannelStopTyping": {
              const channel = this.client.channels.get(packet.id),
                user = await this.client.users.fetch(packet.user);
              if (channel && user) {
                channel.typingIDs.delete(user.id);
                clearTimeout(timeouts[channel.id + user.id]);
                this.client.emit("channelStopTyping", user, channel);
              }
              break;
            }
            case "Pong": {
              this.ping = +new Date() - packet.data;
              break;
            }
            default:
              this.client.options.debug &&
                console.warn(`Warning: Unhandled packet! ${packet.type}`);
          }
        } catch (e) {
          console.error(e);
        }
      };

      const timeouts: Record<string, NodeJS.Timeout> = {};
      const handle = async (msg: WebSocket.MessageEvent) => {
        const data = msg.data;
        if (typeof data !== "string") return;
        if (this.client.options.debug) console.debug("[>>] Incoming Packet", data);
        const packet = JSON.parse(data) as ClientboundNotification;
        await process(packet);
      };

      let processing = false;
      const queue: WebSocket.MessageEvent[] = [];
      this.ws.onmessage = async (data: MessageEvent) => {
        queue.push(data);

        if (!processing) {
          processing = true;
          while (queue.length > 0) {
            await handle(queue.shift()!);
          }
          processing = false;
        }
      };

      this.ws.onerror = (err: any) => reject(err);

      this.ws.onclose = () => {
        this.client.emit("disconnected");
        this.connected = false;
        this.ready = false;

        Object.keys(timeouts)
          .map((k) => timeouts[k])
          .forEach(clearTimeout);

        this.client.users.forEach((user) => user.update({ online: false }));
        this.client.channels.forEach((channel) => (channel.typingIDs.clear(), channel.update()));

        if (!disallowReconnect && this.client.options.reconnect) {
          backOff(() => this.connect(true)).catch(reject);
        }
      };
    });
  }
}
