import { APIServer } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export default class Server extends BaseObject<APIServer> {
  constructor(client: Client, data: APIServer) {
    super(client, data);
  }

  public get name() {
    return this.source.name;
  }
  public get description() {
    return this.source.description ?? null;
  }
  public get nsfw() {
    return !!this.source.nsfw;
  }

  public get ownerID() {
    return this.source.owner;
  }
  public get owner() {
    return this.client.users.get(this.ownerID) ?? null;
  }
  public async fetchOwner(forceNew = false) {
    return await this.client.users.fetch(this.ownerID, forceNew);
  }
}
