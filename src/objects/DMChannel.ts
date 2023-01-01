import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class DMChannel extends Channel {
  public get type(): ChannelType.DM {
    return ChannelType.DM;
  }
  public get source(): Extract<APIChannel, { channel_type: "DirectMessage" }> {
    return <any>super.source;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  /** Will be false if the DM is closed. */
  public get active() {
    return this.source.active;
  }

  public get recipientID() {
    return this.source.recipients.find((r) => r != this.client.user.id);
  }
  public get recipient() {
    return this.recipientID ? this.client.users.get(this.recipientID) : null;
  }
  public async fetchRecipient() {
    return this.recipientID ? await this.client.users.fetch(this.recipientID) : null;
  }
}
