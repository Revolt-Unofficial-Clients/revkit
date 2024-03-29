v1.1.14

- Added `SystemMessageDetail` type.

v1.1.13

- Fixed `channelStartTyping` and `channelStopTyping` events returning incorrect arguments.
- **SEMI-BREAKING:** Changed `ClientEvents` to an interface and implemented it in the EventEmitter.

v1.1.12

- Fixed issue with fetching `@me` as a user.

v1.1.11

- Fix message payload construction of `embed`.

v1.1.10

- Added tag support for autocomplete.
- Added tag support for `expandMentions` in message payload.
- Fixed autocomplete showing for times. (ex. 10:45 autocompletes with ":45")

v1.1.9

- Added `User.discriminator`, `User.tag`, and `User.displayName`.

v1.1.8

- Added `joinCall()` to `DMChannel` and `GroupDMChannel`.

v1.1.7

- Added `toString()` methods to objects.

v1.1.6

- Add `AnyEmoji` utility type.

v1.1.5

- Properly return updated objects for `ChannelManager` and `EmojiManager`.

v1.1.4

- Fixed export for `BaseObject`.
