import { decodeTime } from "ulid";
import Client from "../Client";

export default class BaseObject<APIType extends { _id: string }> {
  /** Original API object. */
  public get source() {
    return this.data;
  }
  constructor(public client: Client, private data: APIType) {}
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
