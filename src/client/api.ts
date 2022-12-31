import { Emoji as APIEmoji, File as APIAttachment, User as APIUser } from "revolt-api";

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

export { APIAttachment, APIEmoji, APIUser };
