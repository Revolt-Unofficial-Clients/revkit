// https://developers.revolt.chat/markdown#timestamps
export enum MarkdownTimestampTypes {
  "01:37" = "t",
  "01:37:42" = "T",
  "22 September 2022" = "D",
  "22 September 2022 01:37" = "f",
  "Thursday, 22 September 2022 01:37" = "F",
  "in 9 months" = "R",
}

/**
 * Converts millisecond time to a markdown timestamp.
 * @param ms Milliseconds to use. NOT UNIX TIMESTAMP (use Date.getTime())
 * @param type The type of timestamp to use.
 * @returns Formatted markdown timestamp.
 */
export default function getMarkdownTimestamp(ms: number, type: MarkdownTimestampTypes) {
  return `<t:${Math.floor(ms / 1000)}:${type}>`;
}
