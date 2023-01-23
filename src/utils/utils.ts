export function escapeRegex(str: String) {
  return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
