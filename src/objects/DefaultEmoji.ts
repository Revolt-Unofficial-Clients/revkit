export class DefaultEmoji {
  public get id() {
    return this.name;
  }
  public get imageURL() {
    return unicodeEmojiURL(RevoltEmojiDictionary[this.name], this.pack);
  }
  public get parent() {
    return null;
  }
  public get uniqueName() {
    return this.name;
  }
  public pack: EmojiPacks = "mutant";
  constructor(public name: string) {}
  public setPack(pack: EmojiPacks) {
    this.pack = pack;
    return this;
  }
}

import { EmojiPacks, RevoltEmojiDictionary, unicodeEmojiURL } from "../utils/Emojis";
