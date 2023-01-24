import { DataEditMessage } from "revolt-api";
import { APIMessage } from "../api";
import { Client } from "../Client";
import { Attachment } from "./Attachment";
import { BaseMessage } from "./BaseMessage";
import Embed from "./Embed";
import EmbedMedia from "./EmbedMedia";
import EmbedWeb from "./EmbedWeb";
import { Emoji } from "./Emoji";

export class Message extends BaseMessage {
  constructor(client: Client, data: APIMessage) {
    super(client, data);
  }

  public get content() {
    return this.source.content ?? null;
  }
  public get attachments() {
    return this.source.attachments?.length
      ? this.source.attachments.map((a) => new Attachment(this.client, a))
      : null;
  }
  public get edited() {
    return this.source.edited ? new Date(this.source.edited) : null;
  }
  public get nonce() {
    return this.source.nonce ?? null;
  }
  public get masquerade() {
    return this.source.masquerade ?? null;
  }
  public generateMasqAvatarURL() {
    const avatar = this.masquerade?.avatar;
    return avatar ? this.client.proxyFile(avatar) : null;
  }

  public get authorID() {
    return this.source.author;
  }
  public get author() {
    return this.client.users.get(this.authorID);
  }
  public async fetchAuthor(fetchNew = false) {
    return await this.client.users.fetch(this.authorID, fetchNew);
  }
  public get member() {
    return this.channel.isServerBased()
      ? this.channel.server.members.get(this.authorID) ?? null
      : null;
  }
  public async fetchMember() {
    return this.channel.isServerBased() ? this.channel.server.members.fetch(this.authorID) : null;
  }

  public get mentionIDs() {
    return this.source.mentions || [];
  }
  public get mentions() {
    return this.mentionIDs.map((id) => this.client.users.get(id)).filter((m) => m);
  }
  public async fetchMentions() {
    return (await Promise.all(this.mentionIDs.map((id) => this.client.users.fetch(id)))).filter(
      (u) => u
    );
  }
  public get replyIDs() {
    return this.source.replies || [];
  }
  public get replies() {
    return this.replyIDs.map((r) => this.channel.messages.get(r)).filter((r) => r);
  }
  public async fetchReplies() {
    return (await Promise.all(this.replyIDs.map((id) => this.channel.messages.fetch(id)))).filter(
      (m) => m
    );
  }

  /** Returns an array of embed objects for this message. */
  public get embeds() {
    return (
      this.source.embeds
        ?.map((e) => {
          switch (e.type) {
            case "Text":
              return new Embed(this.client, e);
            case "Website":
              return new EmbedWeb(this.client, e);
            case "Image":
            case "Video":
              return new EmbedMedia(this.client, e);
          }
        })
        .filter((e) => e) || []
    );
  }

  public get reactions() {
    return Object.entries(this.source.reactions).map((r) => ({
      emoji: r[0],
      userIDs: r[1],
      users: r[1].map((u) => this.client.users.get(u)).filter((u) => u),
    }));
  }
  /** If the message author allows reactions on their messages. */
  public get restrictReactions() {
    return !!this.source.interactions?.restrict_reactions;
  }
  public async react(emoji: Emoji | string) {
    await this.client.api.put(
      `/channels/${<"">this.channel.id}/messages/${this._id}/reactions/${<"">(
        (typeof emoji == "string" ? emoji : emoji.id)
      )}`
    );
  }
  public async unreact(emoji: Emoji | string) {
    await this.client.api.delete(
      `/channels/${<"">this.channel.id}/messages/${this._id}/reactions/${<"">(
        (typeof emoji == "string" ? emoji : emoji.id)
      )}`
    );
  }
  public async clearReactions() {
    await this.client.api.delete(`/channels/${<"">this.channel.id}/messages/${this._id}/reactions`);
  }

  /** Adds an embed to this message. (used internally) */
  public appendEmbed({ embeds }: Pick<Partial<APIMessage>, "embeds">) {
    if (embeds) this.update({ embeds: [...(this.source.embeds ?? []), ...embeds] });
  }
  public async edit(data: DataEditMessage) {
    return this.update(
      await this.client.api.patch(`/channels/${<"">this.channel.id}/messages/${this._id}`, data)
    );
  }
}
