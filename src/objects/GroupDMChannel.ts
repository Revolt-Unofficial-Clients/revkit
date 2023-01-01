import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class GroupDMChannel extends Channel {
  public get type(): ChannelType.GroupDM {
    return ChannelType.GroupDM;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
