import { BaseFlags } from "./Flags";
import { Permissions } from "./Permissions";

export class PermissionFlags extends BaseFlags {
  constructor(bits: number) {
    super(Permissions, bits);
  }
  public has(flag: Permissions) {
    return super.has(flag);
  }
  public all(): Permissions[] {
    return super.all();
  }
}
