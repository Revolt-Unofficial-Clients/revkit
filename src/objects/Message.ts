import { DataEditMessage, DataMessageSend } from "revolt-api";
import { APIMessage } from "../api";
import Client from "../Client";
import Attachment from "./Attachment";
import BaseMessage from "./BaseMessage";
import Emoji from "./Emoji";

export default class Message extends BaseMessage {
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

  public async reply(data: string | DataMessageSend, mention = true) {
    const obj = typeof data === "string" ? { content: data } : data;
    return await this.channel.send({
      ...obj,
      replies: [{ id: this._id, mention }],
    });
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

  public appendEmbed({ embeds }: Pick<Partial<APIMessage>, "embeds">) {
    if (embeds) this.update({ embeds: [...(this.source.embeds ?? []), ...embeds] });
  }
  public async edit(data: DataEditMessage) {
    return this.update(
      await this.client.api.patch(`/channels/${<"">this.channel.id}/messages/${this._id}`, data)
    );
  }
  public async delete() {
    await this.client.api.delete(`/channels/${<"">this.channel.id}/messages/${this._id}`);
    this.channel.messages.delete(this.id);
  }
}
