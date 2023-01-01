import { APIMessage } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export default class BaseMessage extends BaseObject<APIMessage> {
  constructor(client: Client, data: APIMessage) {
    super(client, data);
  }

  public get channelID() {
    return this.source.channel;
  }
  public get channel() {
    return this.client.channels.get(this.channelID);
  }
}
