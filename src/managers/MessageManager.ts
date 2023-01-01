import { APIMessage } from "../api";
import Client from "../Client";
import Channel from "../objects/Channel";
import Message from "../objects/Message";
import BaseManager from "./BaseManager";

export default class MessageManager extends BaseManager<Message> {
  constructor(private client: Client, public channel: Channel) {
    super();
  }

  public construct(data: APIMessage) {
    const has = this.get(data._id);
    if (has) return has.update(data);
    else {
      const message = new Message(this.client, data);
      this.set(message.id, message);
      message.onUpdate(() => this.fireUpdate());
      return message;
    }
  }
  public async fetch(id: string) {
    return this.construct(
      await this.client.api.get(`/channels/${<"">this.channel.id}/messages/${<"">id}`)
    );
  }
}
