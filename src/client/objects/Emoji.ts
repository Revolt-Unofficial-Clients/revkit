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
}
