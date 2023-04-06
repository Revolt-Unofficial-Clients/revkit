import { APIChannel } from "../api";
import { Client } from "../Client";
import { PermissionFlags, PermissionOverride } from "../utils/PermissionFlags";
import { Channel, ChannelType } from "./Channel";

export class ServerChannel extends Channel {
  public get type(): ChannelType.Text | ChannelType.Voice {
    return <any>super.type;
  }
  public get source():
    | Extract<APIChannel, { channel_type: "TextChannel" }>
    | Extract<APIChannel, { channel_type: "VoiceChannel" }> {
    return <any>super.source;
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
  }

  public get serverID() {
    return this.source.server;
  }
  public get server() {
    return this.client.servers.get(this.source.server);
  }

  public get defaultPermissions(): PermissionOverride {
    return {
      allow: new PermissionFlags(this.source.default_permissions?.a || 0),
      deny: new PermissionFlags(this.source.default_permissions?.d || 0),
    };
  }
  public get rolePermissions() {
    return this.source.role_permissions
      ? Object.entries(this.source.role_permissions).map(([id, perm]) => ({
          id,
          allow: new PermissionFlags(perm.a || 0),
          deny: new PermissionFlags(perm.d || 0),
        }))
      : [];
  }
}
