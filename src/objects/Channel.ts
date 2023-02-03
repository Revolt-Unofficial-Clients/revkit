import { DataEditChannel, Override } from "revolt-api";
import { ulid } from "ulid";
import { APIChannel } from "../api";
import { Client } from "../Client";
import { MessageManager } from "../managers/MessageManager";
import { UnreadManager } from "../managers/UnreadManager";
import { constructMessagePayload, MessagePayload } from "../utils/Messaging";
import { PermissionFlags } from "../utils/PermissionFlags";
import { calculatePermissions } from "../utils/Permissions";
import { Attachment, AttachmentArgs } from "./Attachment";
import { BaseMessage } from "./BaseMessage";
import { BaseObject } from "./BaseObject";
import { DMChannel } from "./DMChannel";
import { GroupDMChannel } from "./GroupDMChannel";
import { Member } from "./Member";
import { Message } from "./Message";
import { Role } from "./Role";
import { SavedMessagesChannel } from "./SavedMessagesChannel";
import { ServerChannel } from "./ServerChannel";
import { ServerInvite } from "./ServerInvite";
import { TextChannel } from "./TextChannel";
import { User } from "./User";
import { VoiceChannel } from "./VoiceChannel";

export enum ChannelType {
  DM = "DirectMessage",
  GroupDM = "Group",
  SavedMessages = "SavedMessages",
  Text = "TextChannel",
  Voice = "VoiceChannel",
}
export type ChannelUnreadChecker = (target: Channel) => boolean;

export class Channel extends BaseObject<APIChannel> {
  public get type() {
    return <ChannelType>this.source.channel_type;
  }
  public messages: MessageManager;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    if (this.isTextBased()) this.messages = new MessageManager(this.client, this);
  }

  public isText(): this is TextChannel {
    return this.type == ChannelType.Text;
  }
  public isVoice(): this is VoiceChannel {
    return this.type == ChannelType.Voice;
  }
  public isDM(): this is DMChannel {
    return this.type == ChannelType.DM;
  }
  public isGroupDM(): this is GroupDMChannel {
    return this.type == ChannelType.GroupDM;
  }
  public isSavedMessages(): this is SavedMessagesChannel {
    return this.type == ChannelType.SavedMessages;
  }

  public isTextBased(): this is TextChannel | DMChannel | GroupDMChannel | SavedMessagesChannel {
    return this.isText() || this.isDM() || this.isGroupDM() || this.isSavedMessages();
  }
  public isDMBased(): this is DMChannel | GroupDMChannel {
    return this.isDM() || this.isGroupDM();
  }
  public isServerBased(): this is ServerChannel {
    return this.isText() || this.isVoice();
  }

  public get name(): string {
    if (this.source.channel_type == "SavedMessages") return "Saved Notes";
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

  /** Set permissions for a role or 'default' for everyone. */
  public async setPermissions(role: Role | "default", permissions: Override) {
    await this.client.api.put(
      `/channels/${this._id}/permissions/${typeof role == "string" ? role : role.id}`,
      {
        permissions,
      }
    );
  }
  public get permissions() {
    return new PermissionFlags(calculatePermissions(this));
  }
  public permissionsFor(member: Member) {
    return new PermissionFlags(calculatePermissions(this, member));
  }
  public async createInvite() {
    return new ServerInvite(
      this.client,
      await this.client.api.post(`/channels/${this._id}/invites`)
    );
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

  public lastMessageBy(user: User): Message | null {
    return (
      <Message>this.messages.ordered.reverse().find((m) => m.isUser() && m.authorID == user.id) ??
      null
    );
  }

  /** Can include your own user ID. */
  public typingIDs = new Set<string>();
  /** Will not include your user. */
  public get typing() {
    return [...this.typingIDs.values()]
      .filter((t) => t !== this.client.user.id)
      .map((t) => this.client.users.get(t))
      .filter((u) => u);
  }
  public startTyping() {
    this.client.ws.send({ type: "BeginTyping", channel: this.id });
  }
  public stopTyping() {
    this.client.ws.send({ type: "EndTyping", channel: this.id });
  }

  public checkUnread(valid: ChannelUnreadChecker) {
    if (valid(this)) return false;
    return this.unread;
  }
  public get unread() {
    if (!this.lastMessageID || !this.isTextBased() || this.isSavedMessages()) return false;
    return (
      (this.client.unreads.get(this.id)?.last_id ?? ulid()).localeCompare(this.lastMessageID) === -1
    );
  }
  public getMentions(valid: ChannelUnreadChecker) {
    if (valid(this)) return [];
    return this.mentions;
  }
  public get mentions() {
    if (!this.isTextBased() || this.isSavedMessages()) return [];
    return this.client.unreads.get(this.id)?.mentions ?? [];
  }
  /** Mark a specific message as read/unread. */
  public async ack(message?: BaseMessage | string) {
    const id =
      (typeof message === "string" ? message : message?.id) ?? this.lastMessageID ?? ulid();
    await this.client.api.put(`/channels/${this._id}/ack/${<"">id}`);
  }
  /**
   * Syncs unreads from server and marks channel as read if unread.
   * @param useSeparate If true, will create a new unread object to avoid 'unread flashing'.
   */
  public async markRead(useSeparate = false) {
    if (!this.lastMessageID) return;
    if (useSeparate) {
      this.client.unreads?.markRead(this, this.lastMessageID);
      const unreads = new UnreadManager(this.client);
      await unreads.sync();
      if ((unreads.get(this.id)?.last_id ?? "0").localeCompare(this.lastMessageID) === -1)
        this.ack();
    } else {
      await this.client.unreads.sync();
      if (this.unread) await this.ack();
    }
  }

  /**
   * Set `expandMentions` to automatically turn plaintext user mentions into 'real' ones.
   * Set `expandEmojis` to do the same for emojis (using uniqueName).
   */
  public async send(data: MessagePayload) {
    return this.messages.construct(
      await this.client.api.post(`/channels/${this._id}/messages`, constructMessagePayload(data))
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
