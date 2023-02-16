---
description: Express yourself! With style.
---

# Sending Messages

Sending messages is easy.

The `Channel` class provides a `send()` function, which, sends messages...

I mean, what did you expect from a function that sends messages.

You can also send embeds, but you need to provide content first.

Attachments, in the other hand, require the `id` that the `uploadAttachment()` function returns.

## Sending a message

```javascript
channel.send("**hello world!**");
```

## Sending attachments

```javascript
channel.send({ attachments: ["autumn_attachment_id"] })
```

## Sending embedded content

```javascript
channel.send(" ", {colour: "#fff", title: "this is cool", description: "Hello World!"});
```
