/* Shamelessly copied from revolt.js */

import Long from "long";
import Channel from "../objects/Channel";
import Member from "../objects/Member";
import Role from "../objects/Role";
import Server from "../objects/Server";

/** Permissions against users. */
export enum UserPermissions {
  Access = 1 << 0,
  ViewProfile = 1 << 1,
  SendMessage = 1 << 2,
  Invite = 1 << 3,
}

/** Permissions against servers/channels. */
export enum Permissions {
  // * Generic permissions
  /// Manage the channel or channels on the server
  ManageChannel = 2 ** 0,
  /// Manage the server
  ManageServer = 2 ** 1,
  /// Manage permissions on servers or channels
  ManagePermissions = 2 ** 2,
  /// Manage roles on server
  ManageRole = 2 ** 3,
  /// Manage server customisation (includes emoji)
  ManageCustomisation = 2 ** 4,

  // % 1 bits reserved

  // * Member permissions
  /// Kick other members below their ranking
  KickMembers = 2 ** 6,
  /// Ban other members below their ranking
  BanMembers = 2 ** 7,
  /// Timeout other members below their ranking
  TimeoutMembers = 2 ** 8,
  /// Assign roles to members below their ranking
  AssignRoles = 2 ** 9,
  /// Change own nickname
  ChangeNickname = 2 ** 10,
  /// Change or remove other's nicknames below their ranking
  ManageNicknames = 2 ** 11,
  /// Change own avatar
  ChangeAvatar = 2 ** 12,
  /// Remove other's avatars below their ranking
  RemoveAvatars = 2 ** 13,

  // % 7 bits reserved

  // * Channel permissions
  /// View a channel
  ViewChannel = 2 ** 20,
  /// Read a channel's past message history
  ReadMessageHistory = 2 ** 21,
  /// Send a message in a channel
  SendMessage = 2 ** 22,
  /// Delete messages in a channel
  ManageMessages = 2 ** 23,
  /// Manage webhook entries on a channel
  ManageWebhooks = 2 ** 24,
  /// Create invites to this channel
  InviteOthers = 2 ** 25,
  /// Send embedded content in this channel
  SendEmbeds = 2 ** 26,
  /// Send attachments and media in this channel
  UploadFiles = 2 ** 27,
  /// Masquerade messages using custom nickname and avatar
  Masquerade = 2 ** 28,
  /// React to messages with emoji
  React = 2 ** 29,

  // * Voice permissions
  /// Connect to a voice channel
  Connect = 2 ** 30,
  /// Speak in a voice call
  Speak = 2 ** 31,
  /// Share video in a voice call
  Video = 2 ** 32,
  /// Mute other members with lower ranking in a voice call
  MuteMembers = 2 ** 33,
  /// Deafen other members with lower ranking in a voice call
  DeafenMembers = 2 ** 34,
  /// Move members between voice channels
  MoveMembers = 2 ** 35,

  // * Misc. permissions
  // % Bits 36 to 52: free area
  // % Bits 53 to 64: do not use

  // * Grant all permissions
  /// Safely grant all permissions
  GrantAllSafe = 0x000f_ffff_ffff_ffff,
}

/**
 * Maximum safe value
 */
export const U32_MAX = 2 ** 32 - 1; // 4294967295

/**
 * Permissions allowed for a user while in timeout
 */
export const ALLOW_IN_TIMEOUT = Permissions.ViewChannel + Permissions.ReadMessageHistory;

/**
 * Default permissions if we can only view
 */
export const DEFAULT_PERMISSION_VIEW_ONLY =
  Permissions.ViewChannel + Permissions.ReadMessageHistory;

/**
 * Default base permissions for channels
 */
export const DEFAULT_PERMISSION =
  DEFAULT_PERMISSION_VIEW_ONLY +
  Permissions.SendMessage +
  Permissions.InviteOthers +
  Permissions.SendEmbeds +
  Permissions.UploadFiles +
  Permissions.Connect +
  Permissions.Speak;

/**
 * Permissions in saved messages channel
 */
export const DEFAULT_PERMISSION_SAVED_MESSAGES = Permissions.GrantAllSafe;

/**
 * Permissions in direct message channels / default permissions for group DMs
 */
export const DEFAULT_PERMISSION_DIRECT_MESSAGE =
  DEFAULT_PERMISSION + Permissions.React + Permissions.ManageChannel;

/**
 * Permissions in server text / voice channel
 */
export const DEFAULT_PERMISSION_SERVER =
  DEFAULT_PERMISSION + Permissions.React + Permissions.ChangeNickname + Permissions.ChangeAvatar;

interface SmallMember {
  roles: Role[] | null;
  timeoutEnds: Date | null;
}
/** Calculate permissions against an object. (optionally as a different member) */
export function calculatePermissions(target: Channel | Server, as?: Member): number {
  const user = as ? as.user : target.client.user;
  if (user?.privileged) return Permissions.GrantAllSafe;

  if (target instanceof Server) {
    if (target.ownerID == user?.id) return Permissions.GrantAllSafe;
    else {
      const member: SmallMember = as ??
        target.members.get(user.id) ?? { roles: null, timeoutEnds: null };
      if (!member) return 0;

      let perm = Long.fromNumber(target.defaultPermissions.bits);
      if (member.roles && target.roles) {
        const permissions = member.roles.map((r) => r.permissions);
        for (const permission of permissions) {
          perm = perm.or(permission.allow.bits).and(Long.fromNumber(permission.deny.bits).not());
        }
      }
      if (member.timeoutEnds && member.timeoutEnds > new Date()) perm = perm.and(ALLOW_IN_TIMEOUT);

      return perm.toNumber();
    }
  } else {
    if (target.isSavedMessages()) return Permissions.GrantAllSafe;
    else if (target.isDM()) {
      if (target.recipient.permissionsAgainst.has(UserPermissions.SendMessage)) {
        return DEFAULT_PERMISSION_DIRECT_MESSAGE;
      } else {
        return DEFAULT_PERMISSION_VIEW_ONLY;
      }
    } else if (target.isGroupDM()) {
      if (target.ownerID == user?.id) {
        return DEFAULT_PERMISSION_DIRECT_MESSAGE;
      } else {
        return target.permissions.bits ?? DEFAULT_PERMISSION_DIRECT_MESSAGE;
      }
    } else if (target.isServerBased()) {
      const server = target.server;
      if (!server) return 0;

      if (server.ownerID == user?.id) {
        return Permissions.GrantAllSafe;
      } else {
        const member: SmallMember = as ??
          server.members.get(user.id) ?? { roles: null, timeoutEnds: null };
        if (!member) return 0;

        let perm = Long.fromNumber(calculatePermissions(server, as));

        if (target.defaultPermissions) {
          perm = perm
            .or(target.defaultPermissions.allow.bits)
            .and(Long.fromNumber(target.defaultPermissions.deny.bits).not());
        }

        if (member.roles && target.rolePermissions && server.roles) {
          for (const id of member.roles.map((r) => r.id)) {
            const override = target.rolePermissions.find((rp) => rp.id == id);
            if (override)
              perm = perm.or(override.allow.bits).and(Long.fromNumber(override.deny.bits).not());
          }
        }

        if (member.timeoutEnds && member.timeoutEnds > new Date())
          perm = perm.and(ALLOW_IN_TIMEOUT);

        return perm.toNumber();
      }
    }
  }
}
