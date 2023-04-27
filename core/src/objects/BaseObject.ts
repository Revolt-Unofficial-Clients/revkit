import { decodeTime } from "ulid";
import { Client } from "../Client";
import { MiniEmitter } from "../utils/MiniEmitter";

export class BaseObject<APIType extends { _id: string | { user: string } }> extends MiniEmitter {
  /** Original API object. */
  public get source() {
    return this.data;
  }
  protected get _id() {
    return <"">this.id;
  }
  constructor(public client: Client, private data: APIType) {
    super();
  }
  public get id() {
    return typeof this.source._id == "string" ? this.source._id : this.source._id.user;
  }
  public get createdAt() {
    return decodeTime(this.id);
  }
  public deleted = false;
  /** Update this object with new API data. */
  public update(data: Partial<APIType> = {}) {
    Object.entries(data).forEach((e) => (this.data[e[0]] = e[1]));
    this.fireUpdate();
    return this;
  }
  /**
   * Converts this object to a string.
   * @returns The object ID.
   */
  public toString(): string {
    return this.id;
  }
}
