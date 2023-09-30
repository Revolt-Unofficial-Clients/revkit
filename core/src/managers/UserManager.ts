import { APIUser, RelationshipStatus } from "../api";
import { Client } from "../Client";
import { User } from "../objects/User";
import { BaseManager } from "./BaseManager";

export class UserManager extends BaseManager<User> {
  constructor(private client: Client) {
    super();
  }

  public get self() {
    return this.items().find((i) => i.relationship == RelationshipStatus.Self);
  }
  public defaultAvatarURL(id: string) {
    return `${this.client.options.apiURL}/users/${id}/default_avatar`;
  }

  public construct(data: APIUser) {
    const has = this.get(data._id);
    if (has) return has.update(data);
    else {
      const user = new User(this.client, data);
      this.set(user.id, user);
      user.onUpdate(() => this.fireUpdate([user]));
      return user;
    }
  }
  public async fetch(id: string, fetchNew = false) {
    if (this.has(id) && !fetchNew) return this.get(id);
    const res = await this.client.api.get(`/users/${<"">id}`);
    // if we are fetching @me, add the Self relationship status
    return this.construct(id == "@me" ? { ...res, relationship: RelationshipStatus.Self } : res);
  }
}
