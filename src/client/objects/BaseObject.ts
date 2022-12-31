import { decodeTime } from "ulid";
import Client from "../Client";
import { MiniEmitter } from "../utils/MiniEmitter";

export default class BaseObject<APIType extends { _id: string }> extends MiniEmitter {
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
    return this.source._id;
  }
  public get createdAt() {
    return decodeTime(this.id);
  }
  /** Update this object with new API data. */
  public update(data: APIType) {
    this.data = data;
    return this;
  }
}
