import { ulid } from "ulid";
import { APIUnread } from "../api";
import { Client } from "../Client";
import { Channel } from "../objects/Channel";
import { Message } from "../objects/Message";
import { MiniMapEmitter } from "../utils/MiniEmitter";

export class UnreadManager extends MiniMapEmitter<APIUnread> {
  constructor(public client: Client) {
    super();
  }

  /** Fetch new unread data from server. */
  public async sync() {
    const unreads = await this.client.api.get("/sync/unreads");
    for (const unread of unreads) {
      const { _id, ...data } = unread;
      this.set(_id.channel, data);
    }
    this.fireUpdate();
  }

  /** Mark a channel as read and optionally send to server. */
  public async markRead(channel: Channel, message_id?: string, emit = true) {
    const last_id = message_id ?? ulid();
    this.set(channel.id, { last_id });

    if (emit) await channel.ack(last_id);
  }
  /** Mark a channel unread with a custom last_id. */
  public markUnread(channel: Channel, last_id: string) {
    this.set(channel.id, {
      ...this.get(channel.id),
      last_id,
    });
  }
  /** Add a mention to a message. */
  public markMention(message: Message) {
    const unread = this.get(message.channelID);
    this.set(message.channelID, {
      last_id: "0",
      ...unread,
      mentions: [...(unread?.mentions ?? []), message.id],
    });
  }
}
