import { BaseFlags } from "./Flags";
import { Permissions } from "./Permissions";

export class PermissionFlags extends BaseFlags {
  constructor(bits: number) {
    super(Permissions, bits);
  }
  public has(flag: Permissions) {
    return super.has(flag);
  }
  public add(flag: Permissions) {
    return super.add(flag);
  }
  public remove(flag: Permissions) {
    return super.remove(flag);
  }
  public all(): Permissions[] {
    return super.all();
  }
}

export interface PermissionOverride {
  allow: PermissionFlags;
  deny: PermissionFlags;
}
