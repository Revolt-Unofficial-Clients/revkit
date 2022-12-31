import { APIAttachment } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export default class Attachment extends BaseObject<APIAttachment> {
  constructor(client: Client, data: APIAttachment) {
    super(client, data);
  }
  /** Original file name. */
  public get name() {
    return this.source.filename;
  }
  /** MIME type of this file. */
  public get contentType() {
    return this.source.content_type;
  }
  /** File size in bytes. */
  public get size() {
    return this.source.size;
  }
  /** Parsed file metadata. */
  public get metadata() {
    return this.source.metadata;
  }
}
