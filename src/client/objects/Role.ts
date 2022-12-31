import { APIRole } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";
import Server from "./Server";

export default class Role extends BaseObject<APIRole> {
  constructor(client: Client, public server: Server, data: APIRole) {
    super(client, data);
  }

  public get name() {
    return this.source.name;
  }
  public get color() {
    return this.source.colour ?? null;
  }
  public get rank() {
    return this.source.rank || 0;
  }
  public get hoist() {
    return !!this.source.hoist;
  }
  public get permissions() {
    return {
      allow: this.source.permissions.a,
      deny: this.source.permissions.d,
    };
  }
}
