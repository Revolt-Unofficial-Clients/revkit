import { APICategory } from "../api";
import { Client } from "../Client";
import { BaseObject } from "./BaseObject";
import { Server } from "./Server";

export class Category extends BaseObject<APICategory> {
  constructor(client: Client, data: APICategory, public server: Server) {
    super(client, data);
  }
  public get createdAt() {
    if (this.id == "default") return 0;
    else return super.createdAt;
  }
  public get name() {
    return this.source.title;
  }
  public get channelIDs() {
    return this.source.channels;
  }
  public get channels() {
    return this.channelIDs.map((c) => this.server.channels.get(c)).filter((c) => c);
  }
  /** @returns The category name. */
  public toString() {
    return this.name;
  }
}
