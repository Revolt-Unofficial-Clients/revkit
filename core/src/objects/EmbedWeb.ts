import { APIEmbed } from "../api";
import { Client } from "../Client";
import { BaseEmbed } from "./BaseEmbed";

export class EmbedWeb extends BaseEmbed {
  public readonly color?: string;
  public readonly description?: string;
  public readonly iconURL?: string;
  public readonly originalURL?: string;
  public readonly siteName?: string;
  public readonly special?: (APIEmbed & { type: "Website" })["special"];
  public readonly title?: string;
  public readonly url?: string;
  public readonly video?: string;
  private readonly _media?: {
    url: string;
    width: number;
    height: number;
    size?: "Large" | "Preview";
  };

  constructor(public client: Client, public readonly source: APIEmbed & { type: "Website" }) {
    super("Web");
    this.color = source.colour;
    this.description = source.description;
    this.iconURL = source.icon_url;
    this.originalURL = source.original_url;
    this.siteName = source.site_name;
    this.special = source.special;
    this.title = source.title;
    this.url = source.url;
    this._media = source.video || source.image;
  }

  public get proxyIconURL() {
    return this.client.proxyFile(this.iconURL);
  }

  public get media(): {
    height: number;
    proxyURL: string;
    url: string;
    width: number;
  } & ({ type: "Image"; size: "Large" | "Preview" } | { type: "Video" }) {
    if (!this._media) return undefined;
    return "size" in this._media
      ? {
          type: "Image",
          height: this._media.height,
          proxyURL: this.client.proxyFile(this._media.url),
          size: this._media.size,
          url: this._media.url,
          width: this._media.width,
        }
      : {
          type: "Video",
          height: this._media.height,
          proxyURL: this.client.proxyFile(this._media.url),
          url: this._media.url,
          width: this._media.width,
        };
  }
}
