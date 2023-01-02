// The two @insertish packages add ESM support (as far as I can tell)
import { backOff } from "@insertish/exponential-backoff";
import WebSocket from "@insertish/isomorphic-ws";
import { Role } from "revolt-api";
import type { MessageEvent } from "ws";
import { DEAD_ID } from "./api";
import Client from "./Client";
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
              for (const emoji of packet.emojis!) {
                this.client.emojis.construct(emoji);
              }

              this.client.emit("ready");
              this.ready = true;
              resolve();

              //TODO: Sync unreads.
              //this.client.unreads?.sync();

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
                }, this.client.options.heartbeat * 1e3);
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
              channel.update({ last_message_id: message._id });

              this.client.emit("messageCreate");

              /*//TODO:
              if (this.client.unreads && message.mention_ids?.includes(this.client.user!._id)) {
                this.client.unreads.markMention(message.channel_id, message._id);
              }*/
              break;
            }

            case "MessageUpdate": {
              const message = this.client.messages.get(packet.id);
              if (message) {
                message.update(packet.data);
                this.client.emit("message/update", message);
                this.client.emit("message/updated", message, packet);
              }
              break;
            }

            case "MessageAppend": {
              const message = this.client.messages.get(packet.id);
              if (message) {
                message.append(packet.append);
                this.client.emit("message/append", message);
                this.client.emit("message/updated", message, packet);
              }
              break;
            }

            case "MessageDelete": {
              const msg = this.client.messages.get(packet.id);
              this.client.messages.delete(packet.id);
              this.client.emit("message/delete", packet.id, msg);
              break;
            }

            case "MessageReact": {
              const msg = this.client.messages.get(packet.id);
              if (msg) {
                if (msg.reactions.has(packet.emoji_id)) {
                  msg.reactions.get(packet.emoji_id)!.add(packet.user_id);
                } else {
                  msg.reactions.set(packet.emoji_id, new ObservableSet([packet.user_id]));
                }

                this.client.emit("message/updated", msg, packet);
              }
              break;
            }

            case "MessageUnreact": {
              const msg = this.client.messages.get(packet.id);
              if (msg) {
                const user_ids = msg.reactions.get(packet.emoji_id);

                if (user_ids) {
                  user_ids.delete(packet.user_id);
                  if (user_ids.size === 0) {
                    msg.reactions.delete(packet.emoji_id);
                  }
                }

                this.client.emit("message/updated", msg, packet);
              }

              break;
            }

            case "MessageRemoveReaction": {
              const msg = this.client.messages.get(packet.id);

              if (msg) {
                msg.reactions.delete(packet.emoji_id);

                this.client.emit("message/updated", msg, packet);
              }

              break;
            }

            case "BulkMessageDelete": {
              runInAction(() => {
                for (const id of packet.ids) {
                  const msg = this.client.messages.get(id);
                  this.client.messages.delete(id);
                  this.client.emit("message/delete", id, msg);
                }
              });
              break;
            }

            case "ChannelCreate": {
              runInAction(async () => {
                if (packet.type !== "ChannelCreate") throw 0;

                if (
                  packet.channel_type === "TextChannel" ||
                  packet.channel_type === "VoiceChannel"
                ) {
                  const server = await this.client.servers.fetch(packet.server);
                  server.channel_ids.push(packet._id);
                }

                this.client.channels.createObj(packet, true);
              });
              break;
            }

            case "ChannelUpdate": {
              const channel = this.client.channels.get(packet.id);
              if (channel) {
                channel.update(packet.data, packet.clear);
                this.client.emit("channel/update", channel);
              }
              break;
            }

            case "ChannelDelete": {
              const channel = this.client.channels.get(packet.id);
              channel?.delete(false, true);
              this.client.emit("channel/delete", packet.id, channel);
              break;
            }

            case "ChannelGroupJoin": {
              this.client.channels.get(packet.id)?.updateGroupJoin(packet.user);
              break;
            }

            case "ChannelGroupLeave": {
              const channel = this.client.channels.get(packet.id);

              if (channel) {
                if (packet.user === this.client.user?._id) {
                  channel.delete(false, true);
                } else {
                  channel.updateGroupLeave(packet.user);
                }
              }

              break;
            }

            case "ServerCreate": {
              runInAction(async () => {
                const channels = [];
                for (const channel of packet.channels) {
                  channels.push(await this.client.channels.fetch(channel._id, channel));
                }

                await this.client.servers.fetch(packet.id, packet.server);
              });

              break;
            }

            case "ServerUpdate": {
              const server = this.client.servers.get(packet.id);
              if (server) {
                server.update(packet.data, packet.clear);
                this.client.emit("server/update", server);
              }
              break;
            }

            case "ServerDelete": {
              const server = this.client.servers.get(packet.id);
              server?.delete(false, true);
              this.client.emit("server/delete", packet.id, server);
              break;
            }

            case "ServerMemberUpdate": {
              const member = this.client.members.getKey(packet.id);
              if (member) {
                member.update(packet.data, packet.clear);
                this.client.emit("member/update", member);
              }
              break;
            }

            case "ServerMemberJoin": {
              runInAction(async () => {
                await this.client.servers.fetch(packet.id);
                await this.client.users.fetch(packet.user);

                this.client.members.createObj(
                  {
                    _id: {
                      server: packet.id,
                      user: packet.user,
                    },
                    joined_at: new Date().toISOString(),
                  },
                  true
                );
              });

              break;
            }

            case "ServerMemberLeave": {
              if (packet.user === this.client.user!._id) {
                const server_id = packet.id;
                runInAction(() => {
                  this.client.servers.get(server_id)?.delete(false, true);
                  [...this.client.members.keys()].forEach((key) => {
                    if (JSON.parse(key).server === server_id) {
                      this.client.members.delete(key);
                    }
                  });
                });
              } else {
                this.client.members.deleteKey({
                  server: packet.id,
                  user: packet.user,
                });
                this.client.emit("member/leave", {
                  server: packet.id,
                  user: packet.user,
                });
              }

              break;
            }

            case "ServerRoleUpdate": {
              const server = this.client.servers.get(packet.id);
              if (server) {
                const role = {
                  ...server.roles?.[packet.role_id],
                  ...packet.data,
                } as Role;
                server.roles = {
                  ...server.roles,
                  [packet.role_id]: role,
                };
                this.client.emit("role/update", packet.role_id, role, packet.id);
              }
              break;
            }

            case "ServerRoleDelete": {
              const server = this.client.servers.get(packet.id);
              if (server) {
                const { [packet.role_id]: _, ...roles } = server.roles ?? {};
                server.roles = roles;
                this.client.emit("role/delete", packet.role_id, packet.id);
              }
              break;
            }

            case "UserUpdate": {
              this.client.users.get(packet.id)?.update(packet.data, packet.clear);
              break;
            }

            case "UserRelationship": {
              const user = this.client.users.get(packet.user._id);
              if (user) {
                user.update({
                  ...packet.user,
                  relationship: packet.status,
                });
              } else {
                this.client.users.createObj(packet.user);
              }

              break;
            }

            case "ChannelStartTyping": {
              const channel = this.client.channels.get(packet.id);
              const user = packet.user;

              if (channel) {
                channel.updateStartTyping(user);

                clearInterval(timeouts[packet.id + user]);
                timeouts[packet.id + user] = setTimeout(() => {
                  channel!.updateStopTyping(user);
                }, 3000) as unknown as number;
              }

              break;
            }

            case "ChannelStopTyping": {
              this.client.channels.get(packet.id)?.updateStopTyping(packet.user);
              clearInterval(timeouts[packet.id + packet.user]);
              break;
            }

            case "ChannelAck": {
              this.client.unreads?.markRead(packet.id, packet.message_id);
              break;
            }

            case "EmojiCreate": {
              this.client.emojis.createObj(packet, true);
              break;
            }

            case "EmojiDelete": {
              const emoji = this.client.emojis.get(packet.id);
              this.client.emit("emoji/delete", packet.id, emoji);
              break;
            }

            case "Pong": {
              this.ping = +new Date() - packet.data;
              break;
            }

            default:
              this.client.debug && console.warn(`Warning: Unhandled packet! ${packet.type}`);
          }
        } catch (e) {
          console.error(e);
        }
      };

      const timeouts: Record<string, number> = {};
      const handle = async (msg: WebSocket.MessageEvent) => {
        const data = msg.data;
        if (typeof data !== "string") return;

        if (this.client.debug) console.debug("[>] PACKET", data);
        const packet = JSON.parse(data) as ClientboundNotification;
        await process(packet);
      };

      let processing = false;
      const queue: WebSocket.MessageEvent[] = [];
      ws.onmessage = async (data: MessageEvent) => {
        queue.push(data);

        if (!processing) {
          processing = true;
          while (queue.length > 0) {
            await handle(queue.shift()!);
          }
          processing = false;
        }
      };

      ws.onerror = (err: any) => {
        reject(err);
      };

      ws.onclose = () => {
        this.client.emit("dropped");
        this.connected = false;
        this.ready = false;

        Object.keys(timeouts)
          .map((k) => timeouts[k])
          .forEach(clearTimeout);

        runInAction(() => {
          [...this.client.users.values()].forEach((user) => (user.online = false));
          [...this.client.channels.values()].forEach((channel) => channel.typing_ids.clear());
        });

        if (!disallowReconnect && this.client.autoReconnect) {
          backOff(() => this.connect(true)).catch(reject);
        }
      };
    });
  }
}
