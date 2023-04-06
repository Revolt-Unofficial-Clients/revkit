import Long from "long";

// Shamelessly copied from revolt.js
function combineBits(b: number[]) {
  return b.reduce((prev, cur) => prev.or(cur), Long.fromNumber(0));
}
export function bitwiseAndEq(a: number, ...b: number[]) {
  const value = combineBits(b);
  return value.and(a).eq(value);
}

export class BaseFlags {
  constructor(public map: { [key: number]: string }, public bits: number) {}

  public has(flag: number) {
    return bitwiseAndEq(this.bits, flag);
  }
  public add(flag: number) {
    this.bits = Long.fromNumber(flag).or(this.bits).toNumber();
    return this;
  }
  public remove(flag: number) {
    this.bits = combineBits(this.all().filter((a) => a != flag)).toNumber();
    return this;
  }
  public mapAll() {
    return Object.values(this.map)
      .filter((v) => typeof v == "number")
      .map(Number);
  }
  public all() {
    return this.mapAll().filter((v) => this.has(v));
  }
}
