import { APIMember } from "../api";
import Client from "../Client";
import Attachment, { AttachmentArgs } from "./Attachment";
import BaseObject from "./BaseObject";

export default class Member extends BaseObject<APIMember> {
  constructor(client: Client, data: APIMember) {
    super(client, data);
  }

  public get joinedAt() {
    return new Date(this.source.joined_at);
  }
  public get nickname() {
    return this.source.nickname ?? null;
  }
  /** This member's roles. Automatically sorted. */
  public get roles() {
    return this.source.roles
      ? this.source.roles
          .map((r) => this.server.roles.get(r))
          .filter((r) => r)
          .sort((a, b) => b.rank - a.rank)
      : [];
  }
  public get timeoutEnds() {
    return this.source.timeout ? new Date(this.source.timeout) : null;
  }

  public get serverID() {
    return this.source._id.server;
  }
  public get server() {
    return this.client.servers.get(this.serverID);
  }
  public get user() {
    return this.client.users.get(this.id);
  }
  public async fetchUser() {
    return await this.client.users.fetch(this.id);
  }

  public get avatar() {
    return this.source.avatar ? new Attachment(this.client, this.source.avatar) : null;
  }
  public generateAvatarURL(...args: AttachmentArgs) {
    return this.avatar ? this.avatar.generateURL(...args) : null;
  }

  /** Get member rank. Smaller = Higher Rank */
  public get ranking() {
    if (this.id === this.server.ownerID) return -Infinity;
    const roles = this.roles;
    if (roles.length > 0) return roles[roles.length - 1].rank;
    else return Infinity;
  }
  /** Whether you have a higher rank than this member. */
  public get inferior() {
    return (this.server.me?.ranking ?? Infinity) < this.ranking;
  }
}
