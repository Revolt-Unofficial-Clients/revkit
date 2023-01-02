import { APIEmoji } from "../api";
import { Client } from "../Client";
import { Emoji } from "../objects/Emoji";
import { BaseManager } from "./BaseManager";

export class EmojiManager extends BaseManager<Emoji> {
  constructor(private client: Client) {
    super();
  }

  public construct(data: APIEmoji) {
    const has = this.get(data._id);
    if (has) has.update(data);
    else {
      const emoji = new Emoji(this.client, data);
      this.set(emoji.id, emoji);
      emoji.onUpdate(() => this.fireUpdate());
      return emoji;
    }
  }
}
