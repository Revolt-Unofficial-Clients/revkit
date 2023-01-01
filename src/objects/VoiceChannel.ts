import { APIChannel } from "../api";
import Client from "../Client";
import { ChannelType } from "./Channel";
import ServerChannel from "./ServerChannel";

export default class VoiceChannel extends OmitClass(ServerChannel, [
  "fetchLastMessage",
  "fetchMessage",
  "messages",
  "lastMessage",
  "lastMessageID",
  "send",
]) {
  public type: ChannelType.Voice = ChannelType.Voice;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }
}
