import { DataEditServer, Override } from "revolt-api";
import { APIServer } from "../api";
import Client from "../Client";
import BaseManager from "../managers/BaseManager";
import MemberManager from "../managers/MemberManager";
import RoleManager from "../managers/RoleManager";
import { PermissionFlags } from "../utils/PermissionFlags";
import { ServerFlags } from "../utils/ServerFlags";
import Attachment, { AttachmentArgs } from "./Attachment";
import BaseObject from "./BaseObject";
import Category from "./Category";
import Invite from "./Invite";
import Member from "./Member";
import ServerChannel from "./ServerChannel";

export default class Server extends BaseObject<APIServer> {
  public members: MemberManager;
  public roles: RoleManager;
  constructor(client: Client, data: APIServer) {
    super(client, data);
    this.members = new MemberManager(this.client, this);
    this.roles = new RoleManager(this.client, this);
  }
  public update(data: APIServer) {
    super.update(data);
    this.roles.update();
    return this;
  }

  public get channels() {
    const man = new BaseManager<ServerChannel>();
    this.client.channels.forEach((c) => c.isServerBased() && man.set(c.id, c));
    return man;
  }
  public get categories() {
    return (
      this.source.categories?.map((c) => new Category(this.client, { _id: c.id, ...c }, this)) || []
    );
  }
  // Shamelessly copied (and modified) from revolt.js
  /**
   * Get an array of ordered categories with their respective channels.
   * Uncategorized channels are returned in the `id="default"` category.
   */
  public get orderedChannels() {
    const uncategorized = new Set(this.channels.items().map((i) => i.id));
    const cats: Category[] = [];
    let defaultCategory: Category;

    if (this.categories) {
      for (const category of this.categories) {
        const channels = [];
        for (const key of category.channelIDs) {
          if (uncategorized.delete(key)) {
            channels.push(this.channels.get(key)!);
          }
        }

        const cat = new Category(
          this.client,
          {
            _id: category.id,
            title: category.name,
            channels,
          },
          this
        );
        if (cat.id === "default") {
          if (channels.length == 0) continue;
          defaultCategory = cat;
        }
        cats.push(cat);
      }
    }
    if (uncategorized.size > 0) {
      if (defaultCategory) {
        defaultCategory.update({ channels: [...defaultCategory.channelIDs, ...uncategorized] });
      } else {
        cats.unshift(
          new Category(
            this.client,
            {
              _id: "default",
              title: "Default",
              channels: [...uncategorized],
            },
            this
          )
        );
      }
    }
    return cats;
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
  public get me(): Member | null {
    return this.members.get(this.client.users.self.id) ?? null;
  }
  public async fetchMe() {
    return await this.members.fetch(this.client.users.self.id);
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
  public async edit(data: DataEditServer) {
    this.update(await this.client.api.patch(`/servers/${this._id}`, data));
  }
  /** Leave (or delete if owner) this server. */
  public async leave(silent?: boolean) {
    await this.client.api.delete(`/servers/${this._id}`, {
      leave_silently: silent,
    });
    this.client.servers.delete(this.id);
  }

  /** Fetch invites for this server. */
  public async fetchInvites() {
    return (await this.client.api.get(`/servers/${this._id}/invites`)).map(
      (i) => new Invite(this.client, i)
    );
  }
  /** Fetch bans for this server. */
  public async fetchBans() {
    const bans = await this.client.api.get(`/servers/${this._id}/bans`);
    return bans.bans.map((b) => {
      const user = bans.users.find((u) => u._id == b._id.user);
      return {
        userID: user?._id ?? null,
        userUsername: user?.username ?? null,
        userAvatar: user?.avatar ? new Attachment(this.client, user.avatar) : null,
        reason: b.reason ?? null,
      };
    });
  }

  /** Set permissions for a role id or 'default'. */
  public async setRolePermissions(id: "default", permissions: number): Promise<void>;
  public async setRolePermissions<T extends string>(
    id: T extends "default" ? never : T,
    permissions: Override
  ): Promise<void>;
  public async setRolePermissions(id: string, permissions: number | Override): Promise<void> {
    this.update(
      await this.client.api.put(`/servers/${this._id as ""}/permissions/${id as ""}`, {
        permissions: permissions as Override,
      })
    );
  }
}
