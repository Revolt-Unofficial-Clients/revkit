import { APIRole } from "../api";
import { Client } from "../Client";
import { Role } from "../objects/Role";
import { Server } from "../objects/Server";
import { BaseManager } from "./BaseManager";

export class RoleManager extends BaseManager<Role> {
  constructor(private client: Client, private server: Server) {
    super();
    this.update();
  }
  public get ordered() {
    return this.items().sort((a, b) => a.rank - b.rank);
  }

  public async create(name: string, rank?: number) {
    const role = await this.client.api.post(
      `/servers/${<"">this.server.id}/roles`,
      typeof rank == "number"
        ? {
            name,
            rank,
          }
        : { name }
    );
    return this.construct({ _id: role.id, ...role.role });
  }

  public construct(data: APIRole) {
    const has = this.get(data._id);
    if (has) return has.update(data);
    else {
      const role = new Role(this.client, this.server, data);
      this.set(role.id, role);
      role.onUpdate(() => this.fireUpdate());
      return role;
    }
  }
  public update() {
    if (!this.server.source.roles) this.clear();
    else {
      const roles: APIRole[] = Object.entries(this.server.source.roles).map((r) => ({
        _id: r[0],
        ...r[1],
      }));
      this.items().forEach((role) => {
        if (!roles.find((r) => r._id == role.id)) this.delete(role.id);
      });
      roles.forEach((r) => this.construct(r));
    }
  }
}
