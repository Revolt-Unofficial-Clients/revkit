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
