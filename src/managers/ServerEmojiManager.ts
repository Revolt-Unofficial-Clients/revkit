import { DataCreateEmoji } from "revolt-api";
import { Emoji } from "../objects/Emoji";
import { Server } from "../objects/Server";
import { BaseManager } from "./BaseManager";

export class ServerEmojiManager extends BaseManager<Emoji> {
  constructor(public server: Server) {
    super();
  }
  public async create(data: DataCreateEmoji) {
    return await this.server.client.emojis.create(data);
  }
}
