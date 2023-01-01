import { DataEditChannel } from "revolt-api";
import { APIChannel } from "../api";
import Client from "../Client";
import { calculatePermissions } from "../utils/Permissions";
import Attachment, { AttachmentArgs } from "./Attachment";
import BaseObject from "./BaseObject";
import DMChannel from "./DMChannel";
import GroupDMChannel from "./GroupDMChannel";
import Member from "./Member";
import SavedMessagesChannel from "./SavedMessagesChannel";
import ServerChannel from "./ServerChannel";
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
  public isServerBased(): this is ServerChannel {
    return this instanceof ServerChannel;
  }

  public get name() {
    if (this.source.channel_type == "SavedMessages") return "Saved Messages";
    if (this.source.channel_type == "DirectMessage")
      return this.isDM() ? this.recipient.username : "";
    return this.source.name;
  }
  public get description() {
    if (this.source.channel_type == "SavedMessages" || this.source.channel_type == "DirectMessage")
      return null;
    return this.source.description ?? null;
  }
  public get nsfw() {
    if (this.source.channel_type == "DirectMessage" || this.source.channel_type == "SavedMessages")
      return false;
    return !!this.source.nsfw;
  }

  public get icon() {
    if (this.source.channel_type == "SavedMessages") return null;
    if (this.source.channel_type == "DirectMessage")
      return this.isDM() ? this.recipient.avatar : null;
    return this.source.icon ? new Attachment(this.client, this.source.icon) : null;
  }
  public generateIconURL(...args: AttachmentArgs) {
    return this.icon ? this.icon.generateURL(...args) : null;
  }

  public permissionsFor(member: Member) {
    return calculatePermissions(this, member);
  }

  public get lastMessageID() {
    if (this.source.channel_type == "SavedMessages" || this.source.channel_type == "VoiceChannel")
      return null;
    return this.source.last_message_id ?? null;
  }
  public get lastMessage() {
    //TODO:
    return;
  }
  public async fetchLastMessage() {
    //TODO:
  }

  async edit(data: DataEditChannel) {
    this.update(await this.client.api.patch(`/channels/${this._id}`, data));
  }
  /** Delete or leave this channel. */
  async delete(silent?: boolean) {
    await this.client.api.delete(`/channels/${this._id}`, {
      leave_silently: silent,
    });
    if (this.isDM()) this.update({ active: false });
    this.client.channels.delete(this.id);
  }
}
