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
