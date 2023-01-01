import { APIRoutes } from "revolt-api/dist/routes";
import { APIMember, APIMessage, APIUser } from "../api";
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
  public async fetchMultiple(
    params?: (APIRoutes & {
      method: "get";
      path: "/channels/{target}/messages";
    })["params"]
  ) {
    const messages = await this.client.api.get(`/channels/${<"">this.channel.id}/messages`, {
      ...params,
    });
    if (params?.include_users) {
      const items = <{ messages: APIMessage[]; users: APIUser[]; members?: APIMember[] }>messages;
      items.users.forEach((u) => this.client.users.construct(u));
      const channel = this.channel;
      if (channel.isServerBased() && items.members)
        items.members.forEach((m) => channel.server.members.construct(m));
      return items.messages.map((m) => this.construct(m));
    } else {
      return (<APIMessage[]>messages).map((m) => this.construct(m));
    }
  }
}
