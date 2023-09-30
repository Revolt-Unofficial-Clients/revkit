import { DataEditMessage, DataMessageSend, SendableEmbed } from "revolt-api";
import { ulid } from "ulid";
import { Channel } from "../objects/Channel";
import { Embed } from "../objects/Embed";
import { escapeRegex } from "./utils";

export interface MessageOptions {
  expandMentions?: boolean;
  expandEmojis?: boolean;
  embed?: Embed | SendableEmbed;
  embeds?: (Embed | SendableEmbed)[];
}

export type MessagePayload = string | Embed | (Omit<DataMessageSend, "embeds"> & MessageOptions);
export type MessageEditPayload =
  | string
  | Embed
  | (Omit<DataEditMessage, "embeds"> & MessageOptions);

export function constructMessagePayload(data: MessagePayload, channel?: Channel): DataMessageSend {
  let opts: DataMessageSend = {
    nonce: ulid(),
  };

  // if an Embed is passed, set the `embeds` option to that embed
  if (data instanceof Embed) {
    opts.embeds = [data.toJSON()];
  } else {
    // if an object is passed
    if (typeof data !== "string") {
      // move `embed` into the `embeds` array
      if (data.embed) {
        data.embeds = [data.embed, ...(data.embeds || [])];
        delete data.embed;
      }
      // deconstruct any Embeds into JSON
      if (data.embeds) data.embeds = data.embeds.map((e) => (e instanceof Embed ? e.toJSON() : e));
      // omit the type so ts doesnt yell at us about Embed classes
      opts = { ...opts, ...(<Omit<typeof data, "embeds">>data) };
    }
    // set content to passed string or object prop
    opts.content = typeof data == "string" ? data : data.content;
    if (channel) {
      if (
        opts.content &&
        typeof data !== "string" &&
        data.expandMentions &&
        channel.isServerBased()
      ) {
        channel.server.members
          .filter((m) => m.user)
          .forEach(
            (m) =>
              (opts.content = opts.content.replace(
                new RegExp(escapeRegex(`@${m.user.tag}`), "g"),
                `<@${m.id}>`
              ))
          );
      }
      if (
        opts.content &&
        typeof data !== "string" &&
        !(data instanceof Embed) &&
        data.expandEmojis
      ) {
        channel.client.emojis.known.forEach(
          (e) =>
            (opts.content = opts.content.replace(
              new RegExp(escapeRegex(`:${e.uniqueName}:`), "g"),
              `:${e.id}:`
            ))
        );
      }
    }
  }

  return opts;
}

export function constructMessageEditPayload(
  data: MessageEditPayload,
  channel?: Channel
): DataEditMessage {
  const payload = constructMessagePayload(data, channel),
    opts: DataEditMessage = {};

  if ("content" in payload) opts.content = payload.content;
  if ("embeds" in payload) opts.embeds = payload.embeds;

  return opts;
}
