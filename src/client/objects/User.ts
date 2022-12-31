import { APIUser, RelationshipStatus } from "../api";
import Client from "../Client";
import { U32_MAX, UserPermissions } from "../utils/Permissions";
import { UserBadges } from "../utils/UserBadges";
import { UserFlags } from "../utils/UserFlags";
import Attachment, { AttachmentArgs } from "./Attachment";
import BaseObject from "./BaseObject";

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

export default class User extends BaseObject<APIUser> {
  constructor(client: Client, data: APIUser) {
    super(client, data);
  }
  public get username() {
    return this.source.username;
  }
  public get bot(): Bot | null {
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

  public get avatar(): Attachment | null {
    return this.source.avatar ? new Attachment(this.client, this.source.avatar) : null;
  }
  get defaultAvatarURL() {
    return `${this.client.options.apiURL}/users/${this.id}/default_avatar`;
  }
  public generateAvatarURL(...args: AttachmentArgs) {
    if (!args[2]) args[2] = this.defaultAvatarURL;
    return this.avatar ? this.avatar.generateURL(...args) : null;
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

  //TODO:open dm
  /** Send this user a friend request. */
  public async addFriend() {
    return await this.client.api.post(`/users/friend`, {
      username: this.username,
    });
  }
  /** Unfriend this user. */
  public async removeFriend() {
    return await this.client.api.delete(`/users/${this._id}/friend`);
  }
  /** Block this user. */
  public async block() {
    return await this.client.api.put(`/users/${this._id}/block`);
  }
  /** Unblock this user. */
  public async unblock() {
    return await this.client.api.delete(`/users/${this._id}/block`);
  }

  /** Fetch this user's profile information. */
  public async fetchProfile() {
    const profile = await this.client.api.get(`/users/${this._id}/profile`);
    return {
      background: profile.background ? new Attachment(this.client, profile.background) : null,
      bio: profile.content ?? null,
      generateBackgroundURL(...args: AttachmentArgs) {
        return profile.background
          ? new Attachment(this.client, profile.background).generateURL(...args)
          : null;
      },
    };
  }
  /** Fetch your mutual friends/servers with this user. */
  public async fetchMutual() {
    const mutual = await this.client.api.get(`/users/${this._id}/mutual`);
    return {
      friends: mutual.users,
      servers: mutual.servers,
    };
  }

  get permission() {
    let permissions = 0;
    switch (this.relationship) {
      case "Friend":
      case "User":
        return U32_MAX;
      case "Blocked":
      case "BlockedOther":
        return UserPermissions.Access;
      case "Incoming":
      case "Outgoing":
        permissions = UserPermissions.Access;
    }

    if (
      [...this.client.channels.values()].find(
        (channel) =>
          (channel.channel_type === "Group" || channel.channel_type === "DirectMessage") &&
          channel.recipient_ids?.includes(this.client.user!._id)
      ) ||
      [...this.client.members.values()].find((member) => member._id.user === this.client.user!._id)
    ) {
      if (this.client.user?.bot || this.bot) {
        permissions |= UserPermissions.SendMessage;
      }

      permissions |= UserPermissions.Access | UserPermissions.ViewProfile;
    }

    return permissions;
  }
}
