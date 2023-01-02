import { APIChannel, APIServer } from "../api";
import { Client } from "../Client";
import { Server } from "../objects/Server";
import { BaseManager } from "./BaseManager";

export class ServerManager extends BaseManager<Server> {
  constructor(private client: Client) {
    super();
  }

  public construct(data: APIServer) {
    const has = this.get(data._id);
    if (has) return has.update(data);
    else {
      const server = new Server(this.client, data);
      this.set(server.id, server);
      server.onUpdate(() => this.fireUpdate());
      return server;
    }
  }
  public async fetch(id: string, data?: APIServer, channels?: APIChannel[]) {
    if (this.has(id)) return this.get(id).update(data);

    const res = data ?? (await this.client.api.get(`/servers/${<"">id}`));
    if (channels) {
      for (const channel of channels) {
        await this.client.channels.fetch(channel._id, channel);
      }
    } else {
      for (const channel of res.channels) {
        try {
          await this.client.channels.fetch(channel);
        } catch {}
      }
    }
    return this.construct(res);
  }
}
