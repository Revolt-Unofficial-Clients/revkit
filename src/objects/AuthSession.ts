import { APISessionInfo } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export default class AuthSession extends BaseObject<APISessionInfo> {
  constructor(client: Client, data: APISessionInfo) {
    super(client, data);
  }
  public get name() {
    return this.source.name;
  }
  public get token() {
    return this.source.token ?? null;
  }
  public setToken(token: string) {
    this.source.token = token;
    return this;
  }
}
