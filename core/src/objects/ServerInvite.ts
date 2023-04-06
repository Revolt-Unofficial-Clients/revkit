import { APIInvite } from "../api";
import { Client } from "../Client";
import { BaseObject } from "./BaseObject";

export class ServerInvite extends BaseObject<APIInvite> {
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
    return this.client.channels.get(this.channelID);
  }
  public async fetchChannel() {
    return await this.client.channels.fetch(this.channelID);
  }

  public get serverID() {
    return this.source.type == "Server" ? this.source.server : null;
  }
  public get server() {
    return this.serverID ? this.client.servers.get(this.serverID) : null;
  }

  /**
   * Generates a url for this invite.
   * @param base The base url to use without a trailing slash. (default: https://rvlt.gg)
   */
  public generateURL(base = "https://rvlt.gg") {
    return `${base}/${this.id}`;
  }

  public async delete() {
    await this.client.api.delete(`/invites/${this._id}`);
  }
}
