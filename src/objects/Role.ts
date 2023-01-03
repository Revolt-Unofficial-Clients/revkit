import { DataEditRole } from "revolt-api";
import { APIRole } from "../api";
import { Client } from "../Client";
import { PermissionFlags, PermissionOverride } from "../utils/PermissionFlags";
import { BaseObject } from "./BaseObject";
import { Server } from "./Server";

export class Role extends BaseObject<APIRole> {
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
  public get permissions(): PermissionOverride {
    return {
      allow: new PermissionFlags(this.source.permissions.a),
      deny: new PermissionFlags(this.source.permissions.d),
    };
  }

  public async edit(data: DataEditRole) {
    return this.update(
      await this.client.api.patch(`/servers/${<"">this.server.id}/roles/${this._id}`, data)
    );
  }
  public async delete() {
    await this.client.api.delete(`/servers/${this.server.id}/roles/${this._id}`);
    this.server.roles.delete(this.id);
  }
}
