import { SendableEmbed } from "revolt-api";
import { APIEmbed } from "../api";
import { Client } from "../Client";
import { Attachment } from "./Attachment";
import BaseEmbed from "./BaseEmbed";

export default class Embed extends BaseEmbed {
  public color?: string;
  public description?: string;
  public iconURL?: string;
  public media?: Attachment;
  public title?: string;
  public url?: string;

  constructor(public client?: Client, source?: Partial<APIEmbed & { type: "Text" }>) {
    super("Text");
    this.color = source?.colour;
    this.description = source?.description;
    this.iconURL = source?.icon_url;
    this.media = source?.media && this.client ? new Attachment(this.client, source.media) : null;
    this.title = source?.title;
    this.url = source?.url;
  }

  public get proxyIconURL() {
    return this.client ? this.client.proxyFile(this.iconURL) : this.iconURL;
  }

  public setColor(color: string): this {
    this.color = color;
    return this;
  }
  public setDescription(description: string): this {
    this.description = description;
    return this;
  }
  public setIconURL(iconURL: string): this {
    this.iconURL = iconURL;
    return this;
  }
  public setMedia(media: Attachment): this {
    this.media = media;
    return this;
  }
  public setTitle(title: string): this {
    this.title = title;
    return this;
  }
  public setUrl(url: string): this {
    this.url = url;
    return this;
  }

  public toJSON(): SendableEmbed {
    return {
      colour: this.color,
      description: this.description,
      icon_url: this.iconURL,
      media: <any>this.media.source,
      title: this.title,
      url: this.url,
    };
  }
}
