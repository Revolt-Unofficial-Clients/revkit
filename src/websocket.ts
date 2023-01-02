// The two @insertish packages add ESM support (as far as I can tell)
import { backOff } from "@insertish/exponential-backoff";
import WebSocket from "@insertish/isomorphic-ws";
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
              channel.update({ last_message_id: message.id });

              this.client.emit("message", message);

              /*//TODO:
              if (this.client.unreads && message.mention_ids?.includes(this.client.user!._id)) {
                this.client.unreads.markMention(message.channel_id, message._id);
              }*/
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
                      ...new Set([...message.source.reactions?.[packet.emoji_id], packet.user_id]),
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
                server.update({ channels: [...server.source.channels, packet._id] });
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

            /*//TODO:
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
            }*/

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

      const timeouts: Record<string, number> = {};
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
        //TODO: [...this.client.channels.values()].forEach((channel) => channel.typing_ids.clear());

        if (!disallowReconnect && this.client.options.reconnect) {
          backOff(() => this.connect(true)).catch(reject);
        }
      };
    });
  }
}
