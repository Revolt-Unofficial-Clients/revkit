import { APIChannel } from "../api";
import Client from "../Client";
import { PermissionFlags } from "../utils/PermissionFlags";
import Channel, { ChannelType } from "./Channel";

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

  public get permissions() {
    return new PermissionFlags(this.source.permissions || 0);
  }
}
