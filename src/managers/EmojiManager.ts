import { APIEmoji } from "../api";
import { Client } from "../Client";
import { Attachment } from "../objects/Attachment";
import { Emoji } from "../objects/Emoji";
import { Server } from "../objects/Server";
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

  /** Create an emoji. Attachment bucket must be `emojis`. */
  public async create(server: Server, attachment: Attachment, name: string) {
    if (attachment.bucket !== "emojis") throw "Invalid attachment bucket for emoji.";
    return this.construct(
      await this.client.api.put(`/custom/emoji/${<"">attachment.id}`, {
        name,
        parent: { type: "Server", id: server.id },
      })
    );
  }
}
