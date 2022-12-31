import { BaseFlags } from "./Flags";

export enum RevoltServerFlags {
  Official = 1,
  Verified = 2,
}

export class ServerFlags extends BaseFlags {
  constructor(bits: number) {
    super(RevoltServerFlags, bits);
  }
  public has(flag: RevoltServerFlags) {
    return super.has(flag);
  }
  public all(): RevoltServerFlags[] {
    return super.all();
  }
}
