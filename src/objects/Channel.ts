import { DataEditChannel, DataMessageSend, Override } from "revolt-api";
import { ulid } from "ulid";
import { APIChannel } from "../api";
import Client from "../Client";
import MessageManager from "../managers/MessageManager";
import { calculatePermissions } from "../utils/Permissions";
import Attachment, { AttachmentArgs } from "./Attachment";
import BaseObject from "./BaseObject";
import DMChannel from "./DMChannel";
import GroupDMChannel from "./GroupDMChannel";
import Invite from "./Invite";
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
  public messages: MessageManager;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    if (this.isTextBased()) this.messages = new MessageManager(this.client, this);
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

  public async setPermissions(role_id = "default", permissions: Override) {
    return await this.client.api.put(`/channels/${this._id as ""}/permissions/${role_id as ""}`, {
      permissions,
    });
  }
  public permissionsFor(member: Member) {
    return calculatePermissions(this, member);
  }
  public async createInvite() {
    return new Invite(this.client, await this.client.api.post(`/channels/${this._id}/invites`));
  }

  public get lastMessageID() {
    if (this.source.channel_type == "SavedMessages" || this.source.channel_type == "VoiceChannel")
      return null;
    return this.source.last_message_id ?? null;
  }
  public get lastMessage() {
    return this.lastMessageID ? this.messages.get(this.lastMessageID) ?? null : null;
  }
  public async fetchLastMessage() {
    return this.lastMessageID ? await this.fetchMessage(this.lastMessageID) : null;
  }

  public async send(data: string | DataMessageSend) {
    return this.messages.construct(
      await this.client.api.post(`/channels/${this._id}/messages`, {
        nonce: ulid(),
        ...(typeof data === "string" ? { content: data } : data),
      })
    );
  }
  public async fetchMessage(id: string) {
    return await this.messages.fetch(id);
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
