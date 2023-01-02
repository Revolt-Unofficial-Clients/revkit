import { APIMessage } from "../api";
import { Client } from "../Client";
import { BaseObject } from "./BaseObject";
import { Message } from "./Message";
import { SystemMessage } from "./SystemMessage";

export class BaseMessage extends BaseObject<APIMessage> {
  constructor(client: Client, data: APIMessage) {
    super(client, data);
  }

  public isSystem(): this is SystemMessage {
    return this instanceof SystemMessage;
  }
  public isUser(): this is Message {
    return this instanceof Message;
  }

  public get channelID() {
    return this.source.channel;
  }
  public get channel() {
    return this.client.channels.get(this.channelID);
  }
}
