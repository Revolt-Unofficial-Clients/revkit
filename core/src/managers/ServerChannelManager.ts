import { DataCreateChannel } from "revolt-api";
import { Server } from "../objects/Server";
import { ServerChannel } from "../objects/ServerChannel";
import { BaseManager } from "./BaseManager";

export class ServerChannelManager extends BaseManager<ServerChannel> {
  constructor(public server: Server) {
    super();
  }
  public async create(data: DataCreateChannel) {
    return await this.server.client.channels.create(this.server, data);
  }
}
