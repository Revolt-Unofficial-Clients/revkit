import { Channel, Emoji, Member, Server } from "revolt.js";

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
  emojis: Emoji[];
  users: Member[];
  tab(item: Channel | Emoji | Member): AutocompleteTabResult;
}
export const AutocompleteItems: AutocompleteItem[] = [
  { type: AutocompleteType.CHANNEL, delimiter: "#", result: "<#%>" },
  { type: AutocompleteType.EMOJI, delimiter: ":", result: ":%:" },
  { type: AutocompleteType.USER, delimiter: "@", result: "<@%>" },
];

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
    tab: (item) => {
      let newText = text;
      if (item instanceof Channel) {
        const i = AutocompleteItems.find((i) => i.type == AutocompleteType.CHANNEL);
        newText = textBeforeCursor.replace(
          new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"),
          i.result.replace("%", item._id)
        );
      } else if (item instanceof Emoji) {
        const i = AutocompleteItems.find((i) => i.type == AutocompleteType.EMOJI);
        newText = textBeforeCursor.replace(
          new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"),
          i.result.replace("%", item._id)
        );
      } else if (item instanceof Member) {
        const i = AutocompleteItems.find((i) => i.type == AutocompleteType.USER);
        newText = textBeforeCursor.replace(
          new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"),
          i.result.replace("%", item.user._id)
        );
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
      .match(new RegExp(`\\${i.delimiter}(\\S+)?$`, "i"))?.[0]
      ?.substring(i.delimiter.length)
      .toLowerCase();
    if (typeof matchedText !== "string") return (failed += 1);
    switch (i.type) {
      case AutocompleteType.CHANNEL:
        results.channels.push(
          ...server.channels.filter((c) => c.name.toLowerCase().includes(matchedText))
        );
        break;
      case AutocompleteType.EMOJI:
        results.emojis.push(
          ...[...server.client.emojis.values()].filter(
            (e) => e.parent.type == "Server" && e.name.toLowerCase().includes(matchedText)
          )
        );
        break;
      case AutocompleteType.USER:
        results.users.push(
          ...[...server.client.members.values()].filter(
            (m) =>
              m.server._id == server._id &&
              (m.nickname?.toLowerCase().includes(matchedText) ||
                m.user.username.toLowerCase().includes(matchedText))
          )
        );
        break;
    }
  });
  return failed == AutocompleteItems.length ? null : results;
}
