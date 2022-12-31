import { RevoltBadges } from "./Badges";

export class BaseFlags {
  constructor(public map: { [key: number]: string }, public bits: number) {}

  public has(flag: number) {
    return !!(flag & this.bits);
  }
  public all() {
    return Object.values(this.map)
      .filter((v) => typeof v == "number")
      .map(Number)
      .filter((v) => this.has(v));
  }
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
