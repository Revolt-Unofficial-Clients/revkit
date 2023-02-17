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

Sends: **hello world!**

## Sending attachments

```javascript
channel.send({ attachments: ["autumn_attachment_id"] })
```

## Sending embedded content

Using Revolt.js styled embeds

```javascript
channel.send({
    embed: {
        colour: "#fff",
        title: "this is cool",
        description: "Hello World!"
    }
);
```

Using Toolset's `EmbedBuilder`

<pre class="language-javascript"><code class="lang-javascript">const embedContent = new EmbedBuilder({
    color: "#fff",
<strong>    title: "this is cool",
</strong><strong>    description: "Hello World"
</strong><strong>})
</strong><strong>
</strong><strong>channel.send({embed: embedContent});
</strong></code></pre>
