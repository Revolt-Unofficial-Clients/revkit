import { APIMessage } from "../api";
import Client from "../Client";
import Attachment from "./Attachment";
import BaseObject from "./BaseObject";

export default class Message extends BaseObject<APIMessage> {
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

  public get channelID() {
    return this.source.channel;
  }
  public get channel() {
    return this.client.channels.get(this.channelID);
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
    //TODO: and fetchmember
    //@ts-ignore
    return this.channel.isServerBased() ? this.channel.server.members : null;
  }
}
