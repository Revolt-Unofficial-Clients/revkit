import { APIChannel } from "../api";
import Client from "../Client";
import { ChannelType } from "./Channel";
import TextBasedChannel from "./TextBasedChannel";

export default class SavedMessagesChannel extends TextBasedChannel {
  public get type(): ChannelType.SavedMessages {
    return ChannelType.SavedMessages;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
