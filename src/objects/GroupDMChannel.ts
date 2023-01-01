import { APIChannel } from "../api";
import Client from "../Client";
import { PermissionFlags } from "../utils/PermissionFlags";
import Channel, { ChannelType } from "./Channel";
import User from "./User";

export default class GroupDMChannel extends Channel {
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
  public get recipientIDs() {
    return this.source.recipients.filter((r) => r != this.client.user.id);
  }
  public get recipients() {
    return this.recipientIDs.map((id) => this.client.users.get(id)).filter((r) => r);
  }
  public async fetchRecipients() {
    return (await this.client.api.get(`/channels/${this._id}/members`)).map((u) =>
      this.client.users.construct(u)
    );
  }
  /** Add a user to this group. */
  async addMember(user: User | string) {
    await this.client.api.put(
      `/channels/${this._id}/recipients/${(typeof user == "string" ? user : user.id) as ""}`
    );
  }
  /** Remove a user from this group. */
  async removeMember(user: User | string) {
    await this.client.api.delete(
      `/channels/${this._id}/recipients/${(typeof user == "string" ? user : user.id) as ""}`
    );
  }

  public get permissions() {
    return new PermissionFlags(this.source.permissions || 0);
  }
}
