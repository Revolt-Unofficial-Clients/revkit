---
description: giv meh messages please
---

# Getting Messages

We have 2 ways to retrieve messages from a channel. From the `MessageManager`, a function exposed with the property `messages` in a channel, or the web socket, these two have their own purpose and must be used in conjunction in order to get real-time messages and have a better user experience.

## `MessageManager`

### What is a `MessageManager`?

**`MessageManager` ** is a class that manages message related operations. For example, fetching messages is part of this class. **`MessageManager`** extends `BaseManager`, which is similar to what Discord.js provides.

### How can I fetch messages using it?

You can either fetch a specific message or fetch a batch of them.

`fetch` fetches a single message by providing it `id`. You can get a message ID by going into revite and right-clicking a message, then clicking "Copy message ID". This function returns a `Message` object.

`fetchMultiple` in the other hand, allows you to fetch a maximum of 50 messages per call. This is the recommended way to fetch a message for clients. But if you need to fetch a single one for, let's say, a feature, `fetch` is the right approach.

### Getting its content, author, role, etc

To get a message's properties, you first need to check whether a message comes from Revolt itself (aka. a System Message) or an actual user (Bot or User).

A simple `else/if` or `switch` case should work. Use the `isSystem()` and `isUser()` getters to perform this check.

After performing the check, and if the user is a valid one, you can access properties like `author`, `member`, `embeds`, `replies`, etc...

## Web Sockets

Toolset also comes with a way to interact with web socket events. Using the `on()` and `once()` methods.

There are 3 events we can look out for when it comes to messages.

* `message`
* `message/updated`
* `message/deleted`

To listen for new messages, you can use `on()`&#x20;

```javascript
client.on("message", await (message) => {
    console.log(message);
})
```

Like `MessageManager`, messages get converted into Toolset's `Message` Class.

## What are the differences between Revolt.js and Toolset?

* Messages need to be prechecked before being used
* System messages have their own class
* `_id` has been renamed to `id`
* Reactions are now no longer `observable`
* You can fetch mentions through `fetchMentions()`

