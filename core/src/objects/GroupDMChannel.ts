import { APIChannel } from "../api";
import { Client } from "../Client";
import { PermissionFlags } from "../utils/PermissionFlags";
import { Channel, ChannelType } from "./Channel";
import { User } from "./User";

export class GroupDMChannel extends Channel {
  public get type(): ChannelType.GroupDM {
    return ChannelType.GroupDM;
  }
  public get source(): Extract<APIChannel, { channel_type: "Group" }> {
    return <any>super.source;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  public get ownerID() {
    return this.source.owner;
  }
  public get owner() {
    return this.client.users.get(this.ownerID);
  }
  public async fetchOwner(fetchNew = false) {
    return await this.client.users.fetch(this.ownerID, fetchNew);
  }
  /** Does not include yourself. */
  public get recipientIDs() {
    return this.source.recipients.filter((r) => r !== this.client.user.id);
  }
  /** Does not include yourself. */
  public get recipients() {
    return this.recipientIDs.map((id) => this.client.users.get(id)).filter((r) => r);
  }
  /** Does not include yourself. */
  public async fetchRecipients() {
    return (await this.client.api.get(`/channels/${this._id}/members`))
      .map((u) => this.client.users.construct(u))
      .filter((u) => u.id !== this.client.user.id);
  }
  /** Add a user to this group. */
  async addRecipient(user: User | string) {
    await this.client.api.put(
      `/channels/${this._id}/recipients/${(typeof user == "string" ? user : user.id) as ""}`
    );
  }
  /** Remove a user from this group. */
  async removeRecipient(user: User | string) {
    await this.client.api.delete(
      `/channels/${this._id}/recipients/${(typeof user == "string" ? user : user.id) as ""}`
    );
  }

  /** Request a call join token. */
  public async joinCall() {
    return (await this.client.api.post(`/channels/${<"">this.id}/join_call`)).token;
  }

  public get permissions() {
    return new PermissionFlags(this.source.permissions || 0);
  }
}
