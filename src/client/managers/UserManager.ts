import { APIUser } from "../api";
import Client from "../Client";
import User from "../objects/User";
import BaseManager from "./BaseManager";

export default class UserManager extends BaseManager<User> {
  constructor(private client: Client) {
    super();
  }

  public create(data: APIUser) {
    const has = this.get(data._id);
    if (has) {
      return has.update(data);
    } else {
      const user = new User(this.client, data);
      this.set(user.id, user);
      return user;
    }
  }
  public async fetch(id: string, fetchNew = false) {
    if (this.get(id) && !fetchNew) return this.get(id);
    return this.create(await this.client.api.get(`/users/${<"">id}`));
  }
}
