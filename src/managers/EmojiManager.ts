import { APIEmoji } from "../api";
import { Client } from "../Client";
import { Attachment } from "../objects/Attachment";
import { Emoji } from "../objects/Emoji";
import { Server } from "../objects/Server";
import { BaseManager } from "./BaseManager";

export class EmojiManager extends BaseManager<Emoji> {
  constructor(private client: Client) {
    super();
    this.onUpdate(() => (this.orderCache = []));
  }

  private orderCache: Emoji[] = [];
  public get ordered() {
    return this.orderCache.length
      ? this.orderCache
      : (this.orderCache = this.items().sort((e1, e2) => e1.createdAt - e2.createdAt));
  }

  public construct(data: APIEmoji) {
    const has = this.get(data._id);
    if (has) has.update(data);
    else {
      const emoji = new Emoji(this.client, data);
      this.set(emoji.id, emoji);
      emoji.onUpdate(() => this.fireUpdate([emoji]));
      return emoji;
    }
  }
  public async fetch(id: string, fetchNew = false) {
    if (this.get(id) && !fetchNew) return this.get(id);
    return this.construct(await this.client.api.get(`/custom/emoji/${<"">id}`));
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
