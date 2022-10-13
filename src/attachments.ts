import axios from "axios";
import FormData from "form-data";

/**
 * Uploads an attachment to autumn.
 * @param filename Name of the file being uploaded.
 * @param data Buffer or Blob of data to upload.
 * @param type The type of item being uploaded. (default attachment)
 * @param apiURL The API URL to use for uploading.
 * @returns Attachment ID if successful.
 */
export async function uploadAttachment(
  filename: string,
  data: Buffer | Blob,
  type: "attachments" | "icons" | "banners" | "avatars" | "backgrounds" | "emojis" = "attachments",
  apiURL = "https://autumn.revolt.chat"
): Promise<string> {
  const form = new FormData();
  form.append("file", data, filename);
  const res = await axios.post(`${apiURL}/${type}`, form, {
    headers: form.getHeaders(),
    data: form,
  });
  return res.data?.id;
}
