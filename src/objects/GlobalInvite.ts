import { APIGlobalInvite } from "../api";
import { Client } from "../Client";
import { Attachment } from "./Attachment";
import { BaseObject } from "./BaseObject";

export class GlobalInvite extends BaseObject<APIGlobalInvite> {
  /** Invites don't have a creation date. */
  public get createdAt() {
    return 0;
  }
  constructor(client: Client, data: APIGlobalInvite) {
    super(client, data);
  }

  public get type() {
    return this.source.type;
  }

  public get creator() {
    return {
      name: this.source.user_name,
      avatar: this.source.user_avatar ? new Attachment(this.client, this.source.user_avatar) : null,
    };
  }
  public get channel() {
    return {
      id: this.source.channel_id,
      name: this.source.channel_name,
      description: this.source.channel_description ?? null,
    };
  }
  public get server() {
    return this.source.type == "Server"
      ? {
          id: this.source.server_id,
          name: this.source.server_name,
          icon: this.source.server_icon
            ? new Attachment(this.client, this.source.server_icon)
            : null,
          banner: this.source.server_banner
            ? new Attachment(this.client, this.source.server_banner)
            : null,
          members: this.source.member_count,
        }
      : null;
  }

  public async accept() {
    return await this.client.acceptInvite(this);
  }
}
