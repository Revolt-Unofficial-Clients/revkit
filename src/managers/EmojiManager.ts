import { APIEmoji } from "../api";
import { Client } from "../Client";
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
      : (this.orderCache = this.sort((e1, e2) => e1.createdAt - e2.createdAt));
  }
  public get known() {
    return this.filter((e) => e.parentID && this.client.servers.has(e.parentID));
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

  /** Create an emoji. Attachment bucket for ID must be `emojis`. */
  public async create(server: Server, attachmentID: string, name: string) {
    return this.construct(
      await this.client.api.put(`/custom/emoji/${<"">attachmentID}`, {
        name,
        parent: { type: "Server", id: server.id },
      })
    );
  }
}
