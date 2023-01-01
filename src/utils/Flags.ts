import Long from "long";

// Shamelessly copied from revolt.js
export function bitwiseAndEq(a: number, ...b: number[]) {
  const value = b.reduce((prev, cur) => prev.or(cur), Long.fromNumber(0));
  return value.and(a).eq(value);
}

export class BaseFlags {
  constructor(public map: { [key: number]: string }, public bits: number) {}

  public has(flag: number) {
    return bitwiseAndEq(this.bits, flag);
  }
  public all() {
    return Object.values(this.map)
      .filter((v) => typeof v == "number")
      .map(Number)
      .filter((v) => this.has(v));
  }
}
