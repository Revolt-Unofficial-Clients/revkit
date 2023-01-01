import {
  Category,
  Channel as APIChannel,
  Emoji as APIEmoji,
  File as APIAttachment,
  Invite as APIInvite,
  Member as APIMember,
  Message as APIMessage,
  Role,
  Server as APIServer,
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
export const DEAD_ID = "00000000000000000000000000";

type APICategory = Omit<Category, "id"> & { _id: string };
type APIRole = Role & { _id: string };
export {
  APIAttachment,
  APICategory,
  APIChannel,
  APIEmoji,
  APIInvite,
  APIMember,
  APIMessage,
  APIRole,
  APIServer,
  APIUser,
};
