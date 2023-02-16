---
description: How to correctly work with attachments using Autumn
---

# 🖼 Attachments

There is an included function to upload an image to Autumn, Revolt's CDN (Content Delivery Network).

The first argument is the filename of the image.

The second argument is a Buffer or Blob holding the raw image data.

The third argument is optional, and is one of `attachments`, `icons`, `banners`, `avatars`, `backgrounds`, or `emojis`. It defaults to `attachments`.

The fourth argument is optional and is the domain/protocol of a custom Autumn instance to upload to. (do not include the trailing slash)

The function returns an `id`, use this in conjunction with `channel.send()` to send an attachment.

### Usage

#### With existing client from external file

```javascript
// Import existing client from file (example: ./toolset.js)
import { client } from "./toolset.js"
// To upload a message attachment
client.uploadAttachment(
  "image.png",
  imagebuffer
)

// To upload an emoji to a custom server
client.uploadAttachment(
  "emoji.png",
  imagebuffer,
  "emojis",
  "https://autumn.custom.chat"
)
```

#### Without existing client (from Client() method)

```javascript
// Import Client from the revolt-toolset package
import { Client } from "revolt-toolset"
// Extract the uploadAttachment function from Client
const uploadAttachment = new Client().uploadAttachment

// To upload a message attachment
uploadAttachment(
  "image.png",
  imagebuffer
)

// To upload an emoji to a custom server
uploadAttachment(
  "emoji.png",
  imagebuffer,
  "emojis",
  "https://autumn.custom.chat"
)
```

This should function in both the browser and Node.js (using [form-data](https://npmjs.org/package/form-data)).
