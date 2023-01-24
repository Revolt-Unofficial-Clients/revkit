import Embed from "./Embed";
import EmbedMedia from "./EmbedMedia";
import EmbedWeb from "./EmbedWeb";

export default class BaseEmbed {
  constructor(private $: "Text" | "Media" | "Web") {}

  public isText(): this is Embed {
    return this.$ == "Text";
  }
  public isMedia(): this is EmbedMedia {
    return this.$ == "Media";
  }
  public isWeb(): this is EmbedWeb {
    return this.$ == "Web";
  }
}
