import { Emoji as APIEmoji } from "revolt-api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export class Emoji extends BaseObject<APIEmoji> {
  constructor(client: Client, data: APIEmoji) {
    super(client, data);
  }
}
