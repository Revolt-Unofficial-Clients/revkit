import { BaseFlags } from "./Flags";
import { UserPermissions } from "./Permissions";

export class UserPermissionFlags extends BaseFlags {
  constructor(bits: number) {
    super(UserPermissions, bits);
  }
  public has(flag: UserPermissions) {
    return super.has(flag);
  }
  public all(): UserPermissions[] {
    return super.all();
  }
}
