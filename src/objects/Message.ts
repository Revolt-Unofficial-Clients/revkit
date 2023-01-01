import { APIMessage } from "../api";
import Client from "../Client";
import Attachment from "./Attachment";
import BaseMessage from "./BaseMessage";

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
}
