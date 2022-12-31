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

export { APIAttachment, APIEmoji, APIUser };
