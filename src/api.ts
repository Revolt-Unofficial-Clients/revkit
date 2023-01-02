import {
  Category,
  Channel as APIChannel,
  Emoji as APIEmoji,
  File as APIAttachment,
  Invite as APIInvite,
  InviteResponse,
  Member as APIMember,
  Message as APIMessage,
  Role,
  Server as APIServer,
  SessionInfo,
  User as APIUser,
} from "revolt-api";

export enum RelationshipStatus {
  Blocked = "Blocked",
  Friend = "Friend",
  Incoming = "Incoming",
  None = "None",
  Outgoing = "Outgoing",
  /** The client user is this user. */
  Self = "User",
  /** The client user is blocked. */
  SelfBlocked = "BlockedOther",
}
export enum SystemMessageType {
  GroupDescriptionChange = "channel_description_changed",
  GroupIconChange = "channel_icon_changed",
  GroupOwnershipChange = "channel_ownership_changed",
  GroupRenamed = "channel_renamed",
  Text = "text",
  UserAdded = "user_added",
  UserBanned = "user_banned",
  UserJoined = "user_joined",
  UserKicked = "user_kicked",
  UserLeft = "user_left",
  UserRemoved = "user_remove",
}
export const DEAD_ID = "00000000000000000000000000";

type APICategory = Omit<Category, "id"> & { _id: string };
type APIRole = Role & { _id: string };
type APISessionInfo = SessionInfo & { token?: string };
type APIGlobalInvite = InviteResponse & { _id: string };
export {
  APIAttachment,
  APICategory,
  APIChannel,
  APIEmoji,
  APIGlobalInvite,
  APIInvite,
  APIMember,
  APIMessage,
  APIRole,
  APIServer,
  APISessionInfo,
  APIUser,
};
