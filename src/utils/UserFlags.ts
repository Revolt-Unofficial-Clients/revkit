import { BaseFlags } from "./Flags";

export enum RevoltUserFlags {
  Suspended = 1,
  Deleted = 2,
  Banned = 4,
}

export class UserFlags extends BaseFlags {
  constructor(bits: number) {
    super(RevoltUserFlags, bits);
  }
  public has(flag: RevoltUserFlags) {
    return super.has(flag);
  }
  public all(): RevoltUserFlags[] {
    return super.all();
  }
}
