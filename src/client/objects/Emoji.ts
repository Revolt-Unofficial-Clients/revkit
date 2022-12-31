import { APIEmoji } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export class Emoji extends BaseObject<APIEmoji> {
  public name: string;
  public animated: boolean;
  public nsfw: boolean;
  public creatorID: string;

  constructor(client: Client, data: APIEmoji) {
    super(client, data);
    this.name = data.name;
    this.animated = !!data.animated;
    this.nsfw = !!data.nsfw;
    this.creatorID = data.creator_id;
    //TODO: parent
  }

  public get creator() {
    return this.client; //TODO:
  }
  /** The image URL for this emoji. */
  public get imageURL() {
    return `${this.client.config?.features.autumn.url}/emojis/${this.id}${
      this.animated ? "" : "?max_side=128"
    }`;
  }

  /** Delete this emoji. */
  public async delete() {
    return !!(await this.client.api.delete(`/custom/emoji/${this.id}`));
  }
}
