import { Channel } from "../objects/Channel";
import { Emoji } from "../objects/Emoji";
import { Member } from "../objects/Member";
import { Server } from "../objects/Server";
import { EmojiPacks, RevoltEmojiDictionary, unicodeEmojiURL } from "./Emojis";

export enum AutocompleteType {
  CHANNEL,
  EMOJI,
  USER,
}
export interface AutocompleteTabResult {
  text: string;
  newCursor: number;
}
export interface AutocompleteItem {
  type: AutocompleteType;
  delimiter: string;
  result: string;
}
export interface AutocompleteResult {
  channels: Channel[];
  emojis: (DefaultEmoji | Emoji)[];
  users: Member[];
  size: number;
  tab(item: Channel | DefaultEmoji | Emoji | Member): AutocompleteTabResult;
}
export const AutocompleteItems: AutocompleteItem[] = [
  { type: AutocompleteType.CHANNEL, delimiter: "#", result: "<#%>" },
  { type: AutocompleteType.EMOJI, delimiter: ":", result: ":%:" },
  { type: AutocompleteType.USER, delimiter: "@", result: "<@%>" },
];

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
  public pack: EmojiPacks = "mutant";
  constructor(public name: string) {}
  public setPack(pack: EmojiPacks) {
    this.pack = pack;
    return this;
  }
}

export function parseAutocomplete(
  server: Server,
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  const textBeforeCursor = text.slice(0, cursorPos);
  const results: AutocompleteResult = {
    channels: [],
    emojis: [],
    users: [],
    size: 0,
    tab: (item) => {
      let newText = text;
      if (item instanceof Channel) {
        const i = AutocompleteItems.find((i) => i.type == AutocompleteType.CHANNEL);
        newText =
          textBeforeCursor.replace(
            new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"),
            i.result.replace("%", item.id)
          ) + " ";
      } else if (item instanceof Emoji || item instanceof DefaultEmoji) {
        const i = AutocompleteItems.find((i) => i.type == AutocompleteType.EMOJI);
        newText =
          textBeforeCursor.replace(
            new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"),
            i.result.replace("%", item.id)
          ) + " ";
      } else if (item instanceof Member) {
        const i = AutocompleteItems.find((i) => i.type == AutocompleteType.USER);
        newText =
          textBeforeCursor.replace(
            new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"),
            i.result.replace("%", item.user.id)
          ) + " ";
      }
      const totalText = newText + text.slice(cursorPos);
      return {
        text: totalText,
        newCursor: cursorPos + (totalText.length - text.length),
      };
    },
  };
  let failed = 0;
  AutocompleteItems.forEach((i) => {
    const matchedText = textBeforeCursor
      .match(new RegExp(`\\${i.delimiter}([^\\s\\${i.delimiter}]+)?$`, "i"))?.[0]
      ?.substring(i.delimiter.length)
      .toLowerCase();
    if (
      typeof matchedText !== "string" ||
      textBeforeCursor
        .slice(0, textBeforeCursor.length - (matchedText.length + i.delimiter.length))
        .match(new RegExp(`:(([^\\s\\${i.delimiter}]{1,26}))$`))
    )
      return (failed += 1);
    switch (i.type) {
      case AutocompleteType.CHANNEL: {
        const items = server.channels.filter((c) => c.name.toLowerCase().includes(matchedText));
        results.channels.unshift(
          ...items.filter((i) => i.name.toLowerCase().startsWith(matchedText))
        );
        results.channels.push(
          ...items.filter((i) => !i.name.toLowerCase().startsWith(matchedText))
        );
        break;
      }
      case AutocompleteType.EMOJI: {
        const items = [
          ...server.client.emojis.filter((e) => e.name.toLowerCase().includes(matchedText)),
          ...Object.keys(RevoltEmojiDictionary)
            .filter((k) => k.toLowerCase().includes(matchedText))
            .map((k) => new DefaultEmoji(k)),
        ];
        results.emojis.unshift(
          ...items.filter((i) => i.name.toLowerCase().startsWith(matchedText))
        );
        results.emojis.push(...items.filter((i) => !i.name.toLowerCase().startsWith(matchedText)));
        break;
      }
      case AutocompleteType.USER: {
        const items = server.members.filter(
          (m) =>
            m.nickname?.toLowerCase().includes(matchedText) ||
            m.user?.username.toLowerCase().includes(matchedText)
        );
        results.users.unshift(
          ...items.filter((i) =>
            (i.nickname || i.user.username).toLowerCase().startsWith(matchedText)
          )
        );
        results.users.push(
          ...items.filter(
            (i) => !(i.nickname || i.user.username).toLowerCase().startsWith(matchedText)
          )
        );
        break;
      }
    }
  });
  results.size = results.channels.length + results.emojis.length + results.users.length;
  return failed == AutocompleteItems.length ? null : results;
}
