import { DataMessageSend } from "revolt-api";
import { APIMessage } from "../api";
import { Client } from "../Client";
import { BaseObject } from "./BaseObject";
import { Message } from "./Message";
import { SystemMessage } from "./SystemMessage";

export class BaseMessage extends BaseObject<APIMessage> {
  constructor(client: Client, data: APIMessage) {
    super(client, data);
  }

  public isSystem(): this is SystemMessage {
    return !!this.source.system;
  }
  public isUser(): this is Message {
    return !this.isSystem();
  }

  public get channelID() {
    return this.source.channel;
  }
  public get channel() {
    return this.client.channels.get(this.channelID);
  }
  /** Gets this message's channel's server. (if any) */
  public get server() {
    return this.channel.isServerBased() ? this.channel.server : null;
  }

  public async ack() {
    await this.channel?.ack(this);
  }

  public async reply(data: string | DataMessageSend, mention = true) {
    const obj = typeof data === "string" ? { content: data } : data;
    return await this.channel.send({
      ...obj,
      replies: [{ id: this._id, mention }],
    });
  }

  public async delete() {
    await this.client.api.delete(`/channels/${<"">this.channel.id}/messages/${this._id}`);
    this.channel.messages.delete(this.id);
  }
}
