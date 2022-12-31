import { DataEditServer } from "revolt-api";
import { APIServer } from "../api";
import Client from "../Client";
import RoleManager from "../managers/RoleManager";
import { PermissionFlags } from "../utils/PermissionFlags";
import { ServerFlags } from "../utils/ServerFlags";
import Attachment, { AttachmentArgs } from "./Attachment";
import BaseObject from "./BaseObject";
import Invite from "./Invite";

export default class Server extends BaseObject<APIServer> {
  public roles: RoleManager;
  constructor(client: Client, data: APIServer) {
    super(client, data);
    this.roles = new RoleManager(this.client, this);
  }

  public get name() {
    return this.source.name;
  }
  public get description() {
    return this.source.description ?? null;
  }
  public get nsfw() {
    return !!this.source.nsfw;
  }
  public get flags() {
    return new ServerFlags(this.source.flags || 0);
  }

  public get ownerID() {
    return this.source.owner;
  }
  public get owner() {
    return this.client.users.get(this.ownerID) ?? null;
  }
  public async fetchOwner(forceNew = false) {
    return await this.client.users.fetch(this.ownerID, forceNew);
  }

  public get defaultPermissions() {
    return new PermissionFlags(this.source.default_permissions);
  }

  public get icon() {
    return this.source.icon ? new Attachment(this.client, this.source.icon) : null;
  }
  public generateIconURL(...args: AttachmentArgs) {
    return this.icon ? this.icon.generateURL(...args) : null;
  }
  public get banner() {
    return this.source.banner ? new Attachment(this.client, this.source.banner) : null;
  }
  public generateBannerURL(...args: AttachmentArgs) {
    return this.banner ? this.banner.generateURL(...args) : null;
  }

  /** Edit this server. */
  async edit(data: DataEditServer) {
    return await this.client.api.patch(`/servers/${this._id}`, data);
  }
  /** Leave (or delete if owner) this server. */
  async leave(silent?: boolean) {
    await this.client.api.delete(`/servers/${this._id}`, {
      leave_silently: silent,
    });
    this.client.servers.delete(this.id);
  }

  /** Fetch invites for this server. */
  async fetchInvites() {
    return (await this.client.api.get(`/servers/${this._id}/invites`)).map(
      (i) => new Invite(this.client, i)
    );
  }
}
