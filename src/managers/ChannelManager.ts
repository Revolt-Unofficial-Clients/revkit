import { DataCreateChannel } from "revolt-api";
import { APIChannel } from "../api";
import Client from "../Client";
import Channel from "../objects/Channel";
import Server from "../objects/Server";
import BaseManager from "./BaseManager";

export default class ChannelManager extends BaseManager<Channel> {
  constructor(private client: Client) {
    super();
  }

  public construct(data: APIChannel) {
    const has = this.get(data._id);
    if (has) has.update(data);
    else {
      const channel = new Channel(this.client, data);
      this.set(channel.id, channel);
      channel.onUpdate(() => this.fireUpdate());
      return channel;
    }
  }
  public async fetch(id: string, data?: APIChannel) {
    if (this.has(id)) return this.get(id).update(data);
    return this.construct(data ?? (await this.client.api.get(`/channels/${<"">id}`)));
  }

  public async create(server: Server, data: DataCreateChannel) {
    return this.construct(await this.client.api.post(`/servers/${<"">server.id}/channels`, data));
  }
}
