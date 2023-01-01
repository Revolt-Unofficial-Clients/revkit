import { APIChannel } from "../api";
import Client from "../Client";
import { ChannelType } from "./Channel";
import TextBasedChannel from "./TextBasedChannel";

export default class DMChannel extends TextBasedChannel {
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
