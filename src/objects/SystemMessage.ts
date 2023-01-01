import { APIMessage } from "../api";
import Client from "../Client";
import BaseMessage from "./BaseMessage";

export default class SystemMessage extends BaseMessage {
  constructor(client: Client, data: APIMessage) {
    super(client, data);
  }
}
