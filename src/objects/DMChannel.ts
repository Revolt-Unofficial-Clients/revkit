import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class DMChannel extends Channel {
  public get type(): ChannelType.DM {
    return ChannelType.DM;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
