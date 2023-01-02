import { DateTime } from "luxon";
import { OptionsMessageSearch } from "revolt-api";
import { APIRoutes } from "revolt-api/dist/routes";
import { APIMember, APIMessage, APIUser, DEAD_ID } from "../api";
import Client from "../Client";
import BaseMessage from "../objects/BaseMessage";
import Channel from "../objects/Channel";
import Message from "../objects/Message";
import SystemMessage from "../objects/SystemMessage";
import BaseManager from "./BaseManager";

export default class MessageManager extends BaseManager<BaseMessage> {
  constructor(private client: Client, public channel: Channel) {
    super();
  }

  public construct(data: APIMessage): BaseMessage {
    const has = this.get(data._id);
    if (has) return has.update(data);
    else {
      const message = new (data._id == DEAD_ID || data.system ? SystemMessage : Message)(
        this.client,
        data
      );
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
  public async search(params: OptionsMessageSearch) {
    const messages = await this.client.api.post(`/channels/${<"">this.channel.id}/search`, {
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

  /** Delete multiple messages at once. (max 100, no older than 7 days) */
  public async bulkDelete(ids: string[] | Message[]) {
    if (!ids.length) return;
    if (ids[0] instanceof Message) {
      ids = (<Message[]>ids).filter(
        (m) => DateTime.fromMillis(m.createdAt).diffNow("days").days < 7
      );
    }
    await this.client.api.delete(`/channels/${<"">this.channel.id}/messages/bulk`, {
      data: { ids },
    });
    (<string[]>ids).forEach((i) => this.delete(i));
  }
}
