import { APIEmoji } from "../api";
import Client from "../Client";
import { Emoji } from "../objects/Emoji";
import BaseManager from "./BaseManager";

export default class EmojiManager extends BaseManager<Emoji> {
  constructor(private client: Client) {
    super();
  }

  public construct(data: APIEmoji) {
    const emoji = new Emoji(this.client, data);
    this.set(emoji.id, emoji);
    return emoji;
  }
}
