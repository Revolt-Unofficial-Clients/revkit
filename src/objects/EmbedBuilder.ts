import { Attachment } from "revolt-toolset";
import { Embed } from "./Embed";

export class EmbedBuilder extends Embed {
  constructor(data?: {
    color?: string;
    description?: string;
    iconURL?: string;
    media?: Attachment;
    title?: string;
    url?: string;
  }) {
    super();
    if (data) Object.keys(data).forEach((k) => (this[k] = data[k]));
  }
}
