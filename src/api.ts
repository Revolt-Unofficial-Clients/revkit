import {
  Emoji as APIEmoji,
  File as APIAttachment,
  Invite as APIInvite,
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

type APIRole = Role & { _id: string };
export { APIAttachment, APIEmoji, APIInvite, APIRole, APIServer, APIUser };
