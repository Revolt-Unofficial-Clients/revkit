import { DataCreateChannel } from "revolt-api";
import { Client } from "../Client";
import { APIChannel } from "../api";
import { Channel } from "../objects/Channel";
import { DMChannel } from "../objects/DMChannel";
import { GroupDMChannel } from "../objects/GroupDMChannel";
import { SavedMessagesChannel } from "../objects/SavedMessagesChannel";
import { Server } from "../objects/Server";
import { TextChannel } from "../objects/TextChannel";
import { VoiceChannel } from "../objects/VoiceChannel";
import { BaseManager } from "./BaseManager";

export class ChannelManager extends BaseManager<Channel> {
  constructor(private client: Client) {
    super();
  }

  public construct(data: APIChannel): Channel {
    const has = this.get(data._id);
    if (has) return has.update(data);
    else {
      const channel = ((): Channel => {
        switch (data.channel_type) {
          case "DirectMessage":
            return new DMChannel(this.client, data);
          case "Group":
            return new GroupDMChannel(this.client, data);
          case "SavedMessages":
            return new SavedMessagesChannel(this.client, data);
          case "TextChannel":
            return new TextChannel(this.client, data);
          case "VoiceChannel":
            return <any>new VoiceChannel(this.client, data);
        }
      })();
      this.set(channel.id, channel);
      channel.onUpdate(() => this.fireUpdate([channel]));
      return channel;
    }
  }
  public async fetch(id: string, data?: APIChannel) {
    if (this.has(id)) return this.get(id).update(data);
    return this.construct(data ?? (await this.client.api.get(`/channels/${<"">id}`)));
  }

  public async create(server: Server, data: DataCreateChannel) {
    return this.construct(await this.client.api.post(`/servers/${<"">server.id}/channels`, data));
  }
}
