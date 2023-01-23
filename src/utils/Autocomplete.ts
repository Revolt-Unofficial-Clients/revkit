import { User } from "../objects";
import { Channel } from "../objects/Channel";
import { Emoji } from "../objects/Emoji";
import { Member } from "../objects/Member";
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
type AllType =
  | AutocompleteResult["channels"][0]
  | AutocompleteResult["emojis"][0]
  | AutocompleteResult["users"][0];
export interface AutocompleteResult {
  channels: Channel[];
  emojis: (DefaultEmoji | Emoji)[];
  users: User[];
  size: number;
  all: AllType[];
  tab(item: AllType): AutocompleteTabResult;
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

function sortlen<Obj extends Record<string, any>>(items: Obj[], prop: keyof Obj) {
  return items.sort((i1, i2) => i1[prop].length - i2[prop].length);
}

export function parseAutocomplete(
  channel: Channel,
  text: string,
  cursorPos: number
): AutocompleteResult | null {
  const textBeforeCursor = text.slice(0, cursorPos);
  const results: AutocompleteResult = {
    channels: [],
    emojis: [],
    users: [],
    size: 0,
    all: [],
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
        if (channel.isServerBased()) {
          if (matchedText) {
            const items = channel.server.channels.filter((c) =>
              c.name.toLowerCase().includes(matchedText)
            );
            results.channels.unshift(
              ...sortlen(
                items.filter((i) => i.name.toLowerCase().startsWith(matchedText)),
                "name"
              )
            );
            results.channels.push(
              ...sortlen(
                items.filter((i) => !i.name.toLowerCase().startsWith(matchedText)),
                "name"
              )
            );
          } else
            results.channels.push(...channel.server.orderedChannels.map((c) => c.channels).flat(1));
        }
        break;
      }
      case AutocompleteType.EMOJI: {
        if (matchedText) {
          const items = [
            ...channel.client.emojis.filter((e) => e.name.toLowerCase().includes(matchedText)),
            ...Object.keys(RevoltEmojiDictionary)
              .filter((k) => k.toLowerCase().includes(matchedText))
              .map((k) => new DefaultEmoji(k)),
          ];
          results.emojis.unshift(
            ...sortlen(
              items.filter((i) => i.name.toLowerCase().startsWith(matchedText)),
              "name"
            )
          );
          results.emojis.push(
            ...sortlen(
              items.filter((i) => !i.name.toLowerCase().startsWith(matchedText)),
              "name"
            )
          );
        } else failed = AutocompleteItems.length;
        break;
      }
      case AutocompleteType.USER: {
        const items = channel.isServerBased()
          ? (matchedText
              ? channel.server.members.filter(
                  (m) =>
                    m.nickname?.toLowerCase().includes(matchedText) ||
                    m.user?.username.toLowerCase().includes(matchedText)
                )
              : [
                  ...new Set(
                    channel.messages
                      .items()
                      .sort((m1, m2) => m2.createdAt - m1.createdAt)
                      .map((m) => (m.isUser() ? m.author?.id : null))
                      .filter((a) => a)
                  ),
                ].map((i) => {
                  const user = channel.client.users.get(i);
                  return { name: user.username, user };
                })
            ).map((i) => ({ name: i.nickname || i.user?.username || "", user: i.user }))
          : channel.isGroupDM()
          ? [channel.client.user, ...channel.recipients]
              .filter((u) => u.username.toLowerCase().includes(matchedText))
              .map((user) => ({
                name: user.username,
                user,
              }))
          : channel.isDM()
          ? [channel.client.user, channel.recipient]
              .filter((u) => u.username.toLowerCase().includes(matchedText))
              .map((user) => ({
                name: user.username,
                user,
              }))
          : [];
        results.users.unshift(
          ...sortlen(
            items.filter((i) => i.name.toLowerCase().startsWith(matchedText)),
            "name"
          ).map((i) => i.user)
        );
        results.users.push(
          ...sortlen(
            items.filter((i) => !i.name.toLowerCase().startsWith(matchedText)),
            "name"
          ).map((i) => i.user)
        );
        break;
      }
    }
  });
  results.size = results.channels.length + results.emojis.length + results.users.length;
  results.all = [...results.channels, ...results.emojis, ...results.users];
  return failed == AutocompleteItems.length ? null : results;
}
