import { APIAttachment } from "../api";
import Client from "../Client";
import BaseObject from "./BaseObject";

export type AttachmentArgs = [
  options?: {
    max_side?: number;
    size?: number;
    width?: number;
    height?: number;
  },
  allowAnimation?: boolean,
  fallback?: string
];
export type AttachmentBucket =
  | "attachments"
  | "avatars"
  | "backgrounds"
  | "banners"
  | "emojis"
  | "icons";

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
  /** Bucket this attachment was uploaded to. */
  public get bucket() {
    return <AttachmentBucket>this.source.tag;
  }

  /** Generate a URL to this attachment with optional parameters. */
  public generateURL(...args: AttachmentArgs) {
    const [options, allowAnimation, fallback] = args;

    const autumn = this.client.config.features.autumn;
    if (!autumn?.enabled) return fallback;

    // ! FIXME: These limits should be done on Autumn apparently.
    if (this.metadata.type === "Image") {
      if (
        Math.min(this.metadata.width, this.metadata.height) <= 0 ||
        (this.contentType === "image/gif" &&
          Math.max(this.metadata.width, this.metadata.height) >= 1024)
      )
        return fallback;
    }

    const query =
      options && (!allowAnimation || this.contentType !== "image/gif")
        ? "?" + new URLSearchParams(Object.entries(options).map((e) => e.map(String))).toString()
        : "";
    return `${autumn.url}/${this.bucket}/${this.id}${query}`;
  }
}
