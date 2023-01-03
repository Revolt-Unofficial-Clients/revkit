import { APIChannel } from "../api";
import { Client } from "../Client";
import { OmitClass } from "../utils/OmitClass";
import { ChannelType } from "./Channel";
import { ServerChannel } from "./ServerChannel";

export class VoiceChannel extends OmitClass(ServerChannel, [
  "ack",
  "checkUnread",
  "createInvite",
  "fetchLastMessage",
  "fetchMessage",
  "getMentions",
  "lastMessage",
  "lastMessageID",
  "markRead",
  "mentions",
  "messages",
  "send",
  "unread",
]) {
  public type: ChannelType.Voice = ChannelType.Voice;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  /** Request a call join token. */
  public async joinCall() {
    return (await this.client.api.post(`/channels/${<"">this.id}/join_call`)).token;
  }
}
