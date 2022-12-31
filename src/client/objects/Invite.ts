import { APIInvite } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export default class Invite extends BaseObject<APIInvite> {
  /** Invites don't have a creation date. */
  public get createdAt() {
    return 0;
  }
  constructor(client: Client, data: APIInvite) {
    super(client, data);
  }

  public get type() {
    return this.source.type;
  }

  public get creatorID() {
    return this.source.creator;
  }
  public get creator() {
    return this.client.users.get(this.creatorID);
  }
  public async fetchCreator(fetchNew = false) {
    return await this.client.users.fetch(this.creatorID, fetchNew);
  }

  public get channelID() {
    return this.source.creator;
  }
  public get channel() {
    return this.client.users.get(this.channelID);
  }
  public async fetchChannel(fetchNew = false) {
    return await this.client.channels.fetch(this.channelID, fetchNew);
  }

  public get serverID() {
    return this.source.type == "Server" ? this.source.server : null;
  }
  public get server() {
    return this.serverID ? this.client.servers.get(this.serverID) : null;
  }
}
