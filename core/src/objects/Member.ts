import { DataBanCreate, DataMemberEdit } from "revolt-api";
import { Client } from "../Client";
import { APIMember } from "../api";
import { PermissionFlags } from "../utils/PermissionFlags";
import { Permissions, calculatePermissions } from "../utils/Permissions";
import { Attachment, AttachmentArgs } from "./Attachment";
import { BaseObject } from "./BaseObject";
import { Role } from "./Role";

export class Member extends BaseObject<APIMember> {
  constructor(client: Client, data: APIMember) {
    super(client, data);
    this.scheduleTimeoutClear();
    this.onUpdate(() => this.scheduleTimeoutClear());
  }

  public get joinedAt() {
    return new Date(this.source.joined_at);
  }
  public get nickname() {
    return this.source.nickname ?? null;
  }
  /** This member's roles. Automatically sorted. */
  public get roles(): Role[] {
    return this.source.roles
      ? this.source.roles
          .map((r) => this.server.roles.get(r))
          .filter((r) => r)
          .sort((a, b) => b.rank - a.rank)
      : [];
  }
  /** This member's hoisted role. (if any) */
  public get hoistedRole() {
    return this.roles.filter((r) => r.hoist).slice(-1)[0] ?? null;
  }
  /** This member's role defining its color. (if any) */
  public get colorRole() {
    return this.roles.filter((r) => r.color).slice(-1)[0] ?? null;
  }
  /** The Date this member's timeout ends. */
  public get timeoutEnds() {
    return this.source.timeout ? new Date(this.source.timeout) : null;
  }

  public get serverID() {
    return this.source._id.server;
  }
  public get server() {
    return this.client.servers.get(this.serverID);
  }
  public get user() {
    return this.client.users.get(this.id);
  }
  public async fetchUser() {
    return await this.client.users.fetch(this.id);
  }

  public get avatar() {
    return this.source.avatar ? new Attachment(this.client, this.source.avatar) : null;
  }
  public generateAvatarURL(...args: AttachmentArgs) {
    return this.avatar ? this.avatar.generateURL(...args) : null;
  }

  /** This member's permissions. */
  public get permissions() {
    return new PermissionFlags(calculatePermissions(this.server, this));
  }
  /** Get member rank. Smaller = Higher Rank */
  public get ranking() {
    if (this.id === this.server.ownerID) return -Infinity;
    const roles = this.roles;
    if (roles.length > 0) return roles[roles.length - 1].rank;
    else return Infinity;
  }
  /** Whether you have a higher rank than this member. */
  public get inferior() {
    return (this.server.me?.ranking ?? Infinity) < this.ranking;
  }
  /** If you can kick this member. */
  public get kickable() {
    return this.server.me.permissions.has(Permissions.KickMembers) && this.inferior;
  }
  /** If you can ban this member. */
  public get bannable() {
    return this.server.me.permissions.has(Permissions.BanMembers) && this.inferior;
  }
  /** If the target's rank is higher than this member. */
  public inferiorTo(target: Member) {
    return target.ranking < this.ranking;
  }

  /** Edit this member. */
  public async edit(data: DataMemberEdit) {
    this.update(
      await this.client.api.patch(`/servers/${<"">this.serverID}/members/${this._id}`, data)
    );
  }
  /** Add a role to this member. */
  public async addRole(role: Role) {
    const list = new Set(this.roles.map((r) => r.id));
    list.add(role.id);
    return await this.edit({ roles: [...list] });
  }
  /** Remove a role from this member. */
  public async removeRole(role: Role) {
    const list = new Set(this.roles.map((r) => r.id));
    list.delete(role.id);
    return await this.edit(list.size ? { roles: [...list] } : { remove: ["Roles"] });
  }
  /**
   * Set or remove the timeout for this member.
   * @param ends Epoch time for timeout to end or `null` to remove.
   */
  public async timeout(ends: number | null) {
    return await this.edit(
      ends ? { timeout: new Date(ends).toISOString() } : { remove: ["Timeout"] }
    );
  }
  /** Kick this member. */
  public async kick() {
    await this.client.api.delete(`/servers/${this.serverID}/members/${this.id}`);
  }
  /** Ban this member. */
  public async ban(data?: DataBanCreate) {
    await this.server.members.ban(this, data);
  }

  private timeoutClearer: NodeJS.Timeout;
  private scheduleTimeoutClear() {
    if (this.timeoutClearer) clearTimeout(this.timeoutClearer);
    if (this.timeoutEnds) {
      const offset = +this.timeoutEnds - +new Date();
      if (offset > 0) {
        this.timeoutClearer = setTimeout(() => {
          this.update({ timeout: null });
        }, offset);
      } else {
        this.update({ timeout: null });
      }
    }
  }

  /** @returns The member's user formatted for markdown. `<@id>` */
  public toString() {
    return `<@${this.id}>`;
  }
}
