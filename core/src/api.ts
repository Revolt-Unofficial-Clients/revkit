import {
  Category,
  Channel as APIChannel,
  ChannelUnread,
  Embed as APIEmbed,
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

/** Relationship to other users. */
export enum RelationshipStatus {
  /** The user is blocked. */
  Blocked = "Blocked",
  /** The user is your friend. */
  Friend = "Friend",
  /** The user has sent you a friend request. */
  Incoming = "Incoming",
  /** Default. */
  None = "None",
  /** You have sent a friend request to the user. */
  Outgoing = "Outgoing",
  /** The user is you. */
  Self = "User",
  /** The user blocked you. */
  SelfBlocked = "BlockedOther",
}
/** The different types of system messages. */
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
/** 
  * ID made up of all 0s.
  * Used for identifying system messages.
  */
export const DEAD_ID = "00000000000000000000000000";

/** Type compatibility with the Managers. */
type APICategory = Omit<Category, "id"> & { _id: string };
/** Type compatibility with the Managers. */
type APIGlobalInvite = InviteResponse & { _id: string };
/** Type compatibility with the Managers. */
type APIRole = Role & { _id: string };
/** Adds token to session. */
type APISessionInfo = SessionInfo & { token?: string };
/** Type compatibility with the Managers. */
type APIUnread = Omit<ChannelUnread, "_id">;

export {
  APIAttachment,
  APICategory,
  APIChannel,
  APIEmbed,
  APIEmoji,
  APIGlobalInvite,
  APIInvite,
  APIMember,
  APIMessage,
  APIRole,
  APIServer,
  APISessionInfo,
  APIUnread,
  APIUser,
};
