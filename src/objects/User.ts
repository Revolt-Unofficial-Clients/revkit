import { APIUser, RelationshipStatus } from "../api";
import { Client } from "../Client";
import { U32_MAX, UserPermissions } from "../utils/Permissions";
import { UserBadges } from "../utils/UserBadges";
import { UserFlags } from "../utils/UserFlags";
import { UserPermissionFlags } from "../utils/UserPermissionFlags";
import { Attachment, AttachmentArgs } from "./Attachment";
import { BaseObject } from "./BaseObject";

class Bot {
  constructor(private parent: User) {}
  public get ownerID() {
    return this.parent.source.bot.owner;
  }
  public get owner() {
    return this.parent.client.users.get(this.ownerID);
  }
  public async fetchOwner(fetchNew = false) {
    return await this.parent.client.users.fetch(this.ownerID, fetchNew);
  }
}
export interface UserMutuals {
  friends: string[];
  servers: string[];
}
export interface UserProfile {
  background: Attachment | null;
  bio: string | null;
  generateBackgroundURL(...args: AttachmentArgs): string | null;
}

export class User extends BaseObject<APIUser> {
  constructor(client: Client, data: APIUser) {
    super(client, data);
  }
  public get username() {
    return this.source.username;
  }
  public get bot() {
    return this.source.bot ? new Bot(this) : null;
  }
  public get online() {
    return !!this.source.online;
  }
  public get privileged() {
    return !!this.source.privileged;
  }
  public get badges() {
    return new UserBadges(this.source.badges || 0);
  }
  public get flags() {
    return new UserFlags(this.source.flags || 0);
  }

  public get avatar() {
    return this.source.avatar ? new Attachment(this.client, this.source.avatar) : null;
  }
  get defaultAvatarURL() {
    return this.client.users.defaultAvatarURL(this.id);
  }
  public generateAvatarURL(...args: AttachmentArgs) {
    if (!args[2]) args[2] = this.defaultAvatarURL;
    return this.avatar ? this.avatar.generateURL(...args) : this.defaultAvatarURL;
  }

  public get relationship() {
    return <RelationshipStatus>this.source.relationship;
  }
  public get status() {
    return this.source.status?.text ?? null;
  }
  public get presence() {
    return this.source.status?.presence ?? null;
  }

  /** Send this user a friend request. */
  public async addFriend() {
    this.client.users.construct(
      await this.client.api.post(`/users/friend`, {
        username: this.username,
      })
    );
  }
  /** Unfriend this user. */
  public async removeFriend() {
    this.client.users.construct(await this.client.api.delete(`/users/${this._id}/friend`));
  }
  /** Block this user. */
  public async block() {
    this.client.users.construct(await this.client.api.put(`/users/${this._id}/block`));
  }
  /** Unblock this user. */
  public async unblock() {
    this.client.users.construct(await this.client.api.delete(`/users/${this._id}/block`));
  }
  /** Open a DM with this user. */
  public async openDM() {
    let dm = this.client.channels.find((c) => c.isDM() && c.recipientID == this.id);
    if (!dm) {
      const data = await this.client.api.get(`/users/${this._id}/dm`);
      dm = await this.client.channels.fetch(data._id, data);
    }
    return dm.update({ active: true });
  }

  /** Fetch this user's profile information. */
  public async fetchProfile(): Promise<UserProfile> {
    const profile = await this.client.api.get(`/users/${this._id}/profile`),
      client = this.client;
    return {
      background: profile.background ? new Attachment(this.client, profile.background) : null,
      bio: profile.content ?? null,
      generateBackgroundURL(...args) {
        return profile.background
          ? new Attachment(client, profile.background).generateURL(...args)
          : null;
      },
    };
  }
  /** Fetch your mutual friends/servers with this user. */
  public async fetchMutual(): Promise<UserMutuals> {
    const mutual = await this.client.api.get(`/users/${this._id}/mutual`);
    return {
      friends: mutual.users,
      servers: mutual.servers,
    };
  }

  public get permissionsAgainst() {
    let permissions = 0;
    switch (this.relationship) {
      case RelationshipStatus.Friend:
      case RelationshipStatus.Self:
        return new UserPermissionFlags(U32_MAX);
      case RelationshipStatus.Blocked:
      case RelationshipStatus.SelfBlocked:
        return new UserPermissionFlags(UserPermissions.Access);
      case RelationshipStatus.Incoming:
      case RelationshipStatus.Outgoing:
        permissions = UserPermissions.Access;
    }

    if (
      this.client.channels.find(
        (channel) =>
          (channel.isDM() && channel.recipientID == this.id) ||
          (channel.isGroupDM() && channel.recipientIDs.includes(this.id))
      ) ||
      this.client.servers.find((s) => s.members.find((m) => m.id == this.client.user.id))
    ) {
      if (this.client.user.bot || this.bot) {
        permissions |= UserPermissions.SendMessage;
      }

      permissions |= UserPermissions.Access | UserPermissions.ViewProfile;
    }

    return new UserPermissionFlags(permissions);
  }
}
