import { APIRole } from "../api";
import Client from "../Client";
import Role from "../objects/Role";
import Server from "../objects/Server";
import BaseManager from "./BaseManager";

export default class RoleManager extends BaseManager<Role> {
  constructor(private client: Client, private server: Server) {
    super();
  }

  public construct(data: APIRole) {
    const role = new Role(this.client, this.server, data);
    this.set(role.id, role);
    return role;
  }
}
