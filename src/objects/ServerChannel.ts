import { APIChannel } from "../api";
import Client from "../Client";
import Channel, { ChannelType } from "./Channel";

export default class ServerChannel extends Channel {
  public get type(): ChannelType.Text | ChannelType.Voice {
    return <any>super.type;
  }
  public get source():
    | Extract<APIChannel, { channel_type: "TextChannel" }>
    | Extract<APIChannel, { channel_type: "VoiceChannel" }> {
    return <any>super.source;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  public get serverID() {
    return this.source.server;
  }
  public get server() {
    return this.client.servers.get(this.source.server);
  }
}
