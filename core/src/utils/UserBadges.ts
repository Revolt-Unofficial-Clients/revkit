import { BaseFlags } from "./Flags";

export enum RevoltBadges {
  Developer = 1,
  Translator = 2,
  Supporter = 4,
  ResponsibleDisclosure = 8,
  Founder = 16,
  PlatformModeration = 32,
  ActiveSupporter = 64,
  Paw = 128,
  EarlyAdopter = 256,
  ReservedRelevantJokeBadge1 = 512,
  ReservedRelevantJokeBadge2 = 1024,
}

export interface CustomBadge {
  ids: string[];
  name: string;
  description: string;
  image: string;
}
export type UserBadge = Omit<CustomBadge, "ids">;

export class UserBadges extends BaseFlags {
  constructor(bits: number) {
    super(RevoltBadges, bits);
  }
  public has(flag: RevoltBadges) {
    return super.has(flag);
  }
  public all(): RevoltBadges[] {
    return super.all();
  }
}

export const RevoltBadgeData: { [key in RevoltBadges]: UserBadge } = {
  [RevoltBadges.Developer]: {
    name: "Developer",
    description: "Active or significant contributor to Revolt",
    image: "https://app.revolt.chat/assets/badges/developer.svg",
  },
  [RevoltBadges.Translator]: {
    name: "Translator",
    description: "Helped translate Revolt",
    image: "https://app.revolt.chat/assets/badges/translator.svg",
  },
  [RevoltBadges.Supporter]: {
    name: "Supporter",
    description: "Donated to Revolt",
    image: "https://app.revolt.chat/assets/badges/supporter.svg",
  },
  [RevoltBadges.ResponsibleDisclosure]: {
    name: "Responsibly Disclosed Bug(s)",
    description: "Helped discover a security issue and responsibly disclosed it.",
    image:
      "https://autumn.revolt.chat/attachments/HyHA8YJ2oE34fGJPZIK9ZMORp6gF1_i-ER3f2YiveW/shield-regular-36.png",
  },
  [RevoltBadges.Founder]: {
    name: "Founder",
    description: "Founded Revolt.",
    image: "https://app.revolt.chat/assets/badges/founder.svg",
  },
  [RevoltBadges.PlatformModeration]: {
    name: "Platform Moderation",
    description: "Part of the platform moderation team.",
    image: "https://app.revolt.chat/assets/badges/moderation.svg",
  },
  [RevoltBadges.ActiveSupporter]: {
    name: "Supporter",
    description: "Donated to Revolt",
    image: "https://app.revolt.chat/assets/badges/supporter.svg",
  },
  [RevoltBadges.Paw]: {
    name: "🦊",
    description: "paw",
    image: "https://app.revolt.chat/assets/badges/paw.svg",
  },
  [RevoltBadges.EarlyAdopter]: {
    name: "Early Adopter",
    description: "Joined as one of the first 1k users.",
    image: "https://app.revolt.chat/assets/badges/early_adopter.svg",
  },
  [RevoltBadges.ReservedRelevantJokeBadge1]: {
    name: "sus",
    description: "Whatever the funny joke is at any given time.",
    image: "https://app.revolt.chat/assets/badges/amog.svg",
  },
  [RevoltBadges.ReservedRelevantJokeBadge2]: {
    name: "It's Morbin Time",
    description: "Whatever the funny joke is at any given time.",
    image: "https://app.revolt.chat/assets/badges/amorbus.svg",
  },
};
