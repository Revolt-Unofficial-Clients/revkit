import { Emoji } from "../objects/Emoji";
import { Server } from "../objects/Server";
import { BaseManager } from "./BaseManager";

export class ServerEmojiManager extends BaseManager<Emoji> {
  constructor(public server: Server) {
    super();
  }
  public async create(attachmentID: string, name: string) {
    return await this.server.client.emojis.create(this.server, attachmentID, name);
  }
}
