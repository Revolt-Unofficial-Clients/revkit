import { APIMessage, SystemMessageType } from "../api";
import Client from "../Client";
import BaseMessage from "./BaseMessage";
import User from "./User";

export default class SystemMessage extends BaseMessage {
  constructor(client: Client, data: APIMessage) {
    super(client, data);
  }

  public get detail():
    | { type: SystemMessageType.Text; content: string }
    | { type: SystemMessageType.UserAdded; user: User; by: User }
    | { type: SystemMessageType.UserRemoved; user: User; by: User }
    | { type: SystemMessageType.UserJoined; user: User }
    | { type: SystemMessageType.UserLeft; user: User }
    | { type: SystemMessageType.UserKicked; user: User }
    | { type: SystemMessageType.UserBanned; user: User }
    | { type: SystemMessageType.GroupRenamed; name: string; by: User }
    | { type: SystemMessageType.GroupDescriptionChange; by: User }
    | { type: SystemMessageType.GroupIconChange; by: User }
    | { type: SystemMessageType.GroupOwnershipChange; from: User; to: User } {
    const sys = this.source.system,
      get = (id: string) => this.client.users.get(id);

    switch (sys.type) {
      case "text":
        return { type: SystemMessageType.Text, content: sys.content };
      case "user_added":
        return { type: SystemMessageType.UserAdded, user: get(sys.id), by: get(sys.by) };
      case "user_remove":
        return { type: SystemMessageType.UserRemoved, user: get(sys.id), by: get(sys.by) };
      case "user_joined":
        return { type: SystemMessageType.UserJoined, user: get(sys.id) };
      case "user_left":
        return { type: SystemMessageType.UserLeft, user: get(sys.id) };
      case "user_kicked":
        return { type: SystemMessageType.UserKicked, user: get(sys.id) };
      case "user_banned":
        return { type: SystemMessageType.UserBanned, user: get(sys.id) };
      case "channel_renamed":
        return { type: SystemMessageType.GroupRenamed, name: sys.name, by: get(sys.by) };
      case "channel_description_changed":
        return { type: SystemMessageType.GroupDescriptionChange, by: get(sys.by) };
      case "channel_icon_changed":
        return { type: SystemMessageType.GroupIconChange, by: get(sys.by) };
      case "channel_ownership_changed":
        return {
          type: SystemMessageType.GroupOwnershipChange,
          from: get(sys.from),
          to: get(sys.to),
        };
    }
  }
}
