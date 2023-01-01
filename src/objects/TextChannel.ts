import { APIChannel } from "../api";
import Client from "../Client";
import { ChannelType } from "./Channel";
import TextBasedChannel from "./TextBasedChannel";

export default class TextChannel extends TextBasedChannel {
  public get type(): ChannelType.Text {
    return ChannelType.Text;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
