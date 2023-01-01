import { DataBanCreate } from "revolt-api";
import { APIMember } from "../api";
import Client from "../Client";
import Member from "../objects/Member";
import Server from "../objects/Server";
import BaseManager from "./BaseManager";

export default class MemberManager extends BaseManager<Member> {
  constructor(private client: Client, private server: Server) {
    super();
  }

  public get self() {
    return this.items().find((i) => i.id == this.client.users.self.id);
  }

  /** Ban a member from the server. */
  async ban(member: string | Member, data?: DataBanCreate) {
    await this.client.api.put(
      `/servers/${this.server.id}/bans/${typeof member == "string" ? member : member.id}`,
      data
    );
  }

  /** Unban a user from the server. */
  async unban(id: string) {
    await this.client.api.delete(`/servers/${this.server.id as ""}/bans/${id}`);
  }

  public construct(data: APIMember) {
    const has = this.get(data._id.user);
    if (has) return has.update(data);
    else {
      const member = new Member(this.client, data);
      this.set(member.id, member);
      member.onUpdate(() => this.fireUpdate());
      return member;
    }
  }
  public async fetch(id: string, fetchNew = false) {
    if (this.get(id) && !fetchNew) return this.get(id);
    return this.construct(
      await this.client.api.get(`/servers/${<"">this.server.id}/members/${<"">id}`)
    );
  }
}
