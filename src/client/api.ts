import {
  Emoji as APIEmoji,
  File as APIAttachment,
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
  Self = "User",
  SelfBlocked = "BlockedOther",
}
export const DEAD_ID = "00000000000000000000000000";

export type APIRole = Role & { _id: string };
export { APIAttachment, APIEmoji, APIServer, APIUser };
