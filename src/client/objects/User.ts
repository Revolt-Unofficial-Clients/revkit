import { APIUser } from "../api";
import Client from "../Client";
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
  public get avatar(): Attachment | null {
    return this.source.avatar ? new Attachment(this.client, this.source.avatar) : null;
  }
  public generateAvatarURL(...args: AttachmentArgs) {
    return this.avatar ? this.avatar.generateURL(...args) : null;
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
}
/*
    badges: Nullable<number>;
    status: Nullable<UserStatus>;
    relationship: Nullable<RelationshipStatus>;
    online: boolean;
    privileged: boolean;
    flags: Nullable<number>;
*/
