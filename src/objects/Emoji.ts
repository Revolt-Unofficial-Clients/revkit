import { APIEmoji } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export class Emoji extends BaseObject<APIEmoji> {
  constructor(client: Client, data: APIEmoji) {
    super(client, data);
  }

  public get name() {
    return this.source.name;
  }
  public get animated() {
    return !!this.source.animated;
  }
  public get nsfw() {
    return !!this.source.nsfw;
  }
  public get creatorID() {
    return this.source.creator_id;
  }
  public get creator() {
    return this.client.users.get(this.creatorID);
  }
  public async fetchCreator(fetchNew = false) {
    return await this.client.users.fetch(this.creatorID, fetchNew);
  }
  /** The image URL for this emoji. */
  public get imageURL() {
    return `${this.client.config?.features.autumn.url}/emojis/${this.id}${
      this.animated ? "" : "?max_side=128"
    }`;
  }

  public get parentID() {
    return this.source.parent.type == "Server" ? this.source.parent.id : "";
  }
  public get parent() {
    return this.parentID ? this.client.servers.get(this.parentID) ?? null : null;
  }

  /** Delete this emoji. */
  public async delete() {
    await this.client.api.delete(`/custom/emoji/${this._id}`);
    this.client.emojis.delete(this.id);
  }
}
