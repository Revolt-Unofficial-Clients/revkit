import { APIServer } from "../api";
import Client from "../Client";
import Server from "../objects/Server";
import BaseManager from "./BaseManager";

export default class ServerManager extends BaseManager<Server> {
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
}
