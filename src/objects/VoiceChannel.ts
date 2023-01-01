import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class VoiceChannel extends Channel {
  public get type(): ChannelType.Voice {
    return ChannelType.Voice;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
