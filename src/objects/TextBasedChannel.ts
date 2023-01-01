import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class TextBasedChannel extends Channel {
  public get type():
    | ChannelType.DM
    | ChannelType.GroupDM
    | ChannelType.SavedMessages
    | ChannelType.Text {
    return <any>super.type;
  }

  public get source():
    | Extract<APIChannel, { channel_type: "DirectMessage" }>
    | Extract<APIChannel, { channel_type: "Group" }>
    | Extract<APIChannel, { channel_type: "SavedMessages" }>
    | Extract<APIChannel, { channel_type: "TextChannel" }> {
    return <any>super.source;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  public get lastMessageID() {
    if (this.source.channel_type == "SavedMessages") return null;
    return this.source.last_message_id ?? null;
  }
  public get lastMessage() {
    //TODO:
    return;
  }
  public async fetchLastMessage() {
    //TODO:
  }
}
