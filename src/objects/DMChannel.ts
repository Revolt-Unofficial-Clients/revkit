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
}
