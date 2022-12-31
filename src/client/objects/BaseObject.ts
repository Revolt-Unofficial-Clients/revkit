import { decodeTime } from "ulid";
import Client from "../Client";

export default class BaseObject<APIType extends { _id: string }> {
  public id: string;
  constructor(public client: Client, data: APIType) {
    this.id = data._id;
  }
  public get createdAt() {
    return decodeTime(this.id);
  }
}
