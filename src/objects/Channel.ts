import { APIChannel } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";
import DMChannel from "./DMChannel";
import GroupDMChannel from "./GroupDMChannel";
import SavedMessagesChannel from "./SavedMessagesChannel";
import TextChannel from "./TextChannel";
import VoiceChannel from "./VoiceChannel";

export enum ChannelType {
  DM = "DirectMessage",
  GroupDM = "Group",
  SavedMessages = "SavedMessages",
  Text = "TextChannel",
  Voice = "VoiceChannel",
}

export default class Channel extends BaseObject<APIChannel> {
  public get type() {
    return <ChannelType>this.source.channel_type;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  public isText(): this is TextChannel {
    return this instanceof TextChannel;
  }
  public isVoice(): this is VoiceChannel {
    return this instanceof VoiceChannel;
  }
  public isDM(): this is DMChannel {
    return this instanceof DMChannel;
  }
  public isGroupDM(): this is GroupDMChannel {
    return this instanceof GroupDMChannel;
  }
  public isSavedMessages(): this is SavedMessagesChannel {
    return this instanceof SavedMessagesChannel;
  }

  public isTextBased(): this is TextChannel | DMChannel | GroupDMChannel | SavedMessagesChannel {
    return this.isText() || this.isDM() || this.isGroupDM() || this.isSavedMessages();
  }
  public isDMBased(): this is DMChannel | GroupDMChannel {
    return this.isDM() || this.isGroupDM();
  }
  public isServerBased(): this is TextChannel | VoiceChannel {
    return this.isText() || this.isVoice();
  }
}
