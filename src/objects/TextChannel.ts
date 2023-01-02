import { APIChannel } from "../api";
import { Client } from "../Client";
import { ChannelType } from "./Channel";
import { ServerChannel } from "./ServerChannel";

export class TextChannel extends ServerChannel {
  public get type(): ChannelType.Text {
    return ChannelType.Text;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
