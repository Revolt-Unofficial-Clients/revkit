import { APIEmbed } from "../api";
import { Client } from "../Client";
import { BaseEmbed } from "./BaseEmbed";

export class EmbedMedia extends BaseEmbed {
  constructor(
    public client: Client,
    public readonly source: (APIEmbed & { type: "Video" }) | (APIEmbed & { type: "Image" })
  ) {
    super("Media");
  }

  public get type() {
    return this.source.type;
  }
  public get url() {
    return this.source.url;
  }
  public get proxyURL() {
    return this.client.proxyFile(this.url);
  }
  public get width() {
    return this.source.width;
  }
  public get height() {
    return this.source.height;
  }
  public get size() {
    return "size" in this.source ? this.source.size : "Large";
  }
}
