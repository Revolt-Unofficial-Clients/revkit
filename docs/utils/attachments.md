# Attachments

There is an included function to upload an image to Autumn.

The first argument is the filename of the image.

The second argument is a Buffer or Blob holding the raw image data.

The third argument is optional, and is one of `attachments`, `icons`, `banners`, `avatars`, `backgrounds`, or `emojis`. It defaults to `attachments`.

The fourth argument is optional and is the domain/protocol of a custom Autumn instance to upload to. (do not include the trailing slash)

### Usage

```javascript
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

This should function in both the browser and NodeJS (using [form-data](https://npmjs.org/package/form-data)).
