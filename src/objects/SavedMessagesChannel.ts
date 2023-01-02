import { APIChannel } from "../api";
import { Client } from "../Client";
import { Channel, ChannelType } from "./Channel";

export class SavedMessagesChannel extends Channel {
  public get type(): ChannelType.SavedMessages {
    return ChannelType.SavedMessages;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
