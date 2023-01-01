import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class TextChannel extends Channel {
  public get type(): ChannelType.Text {
    return ChannelType.Text;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
