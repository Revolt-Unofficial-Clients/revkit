import { APIChannel } from "../api";
import Client from "../Client";
import Channel from "../objects/Channel";
import Server from "../objects/Server";
import BaseManager from "./BaseManager";

export default class ChannelManager extends BaseManager<Channel> {
  constructor(private client: Client, private server: Server) {
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
}
