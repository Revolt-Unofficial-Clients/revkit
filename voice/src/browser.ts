import * as MSC from "mediasoup-client";
import { Client } from "revkit";
import { VoiceClient as BaseVoiceClient, type VoiceClientConsumer } from "./VoiceClient";
import type { ProduceType, VoiceClientOptions } from "./types";

/** A default audio consumer for voice. (plays the audio with `Audio`) */
export const DEFAULT_CONSUMER: VoiceClientConsumer<"browser"> = (type, track) => {
  if (type == "audio") {
    const mediaStream = new MediaStream([track]);
    const audio = new Audio();
    audio.srcObject = mediaStream;
    audio.load();
    audio.play();
    return () => audio.pause();
  }
  return () => {};
};

/**
 * A VoiceClient implementation for use in browsers.
 * You can pass DEFAULT_CONSUMER to the trackConsumer to simply play the audio in the browser using `Audio`.
 */
export default class VoiceClient extends BaseVoiceClient<"browser"> {
  /**
   * @param trackConsumer A function that is called when there is a new `MediaStreamTrack` to play. The function returned will be called when the track ends.
   */
  constructor(client: Client | VoiceClientOptions, trackConsumer?: VoiceClientConsumer<"browser">) {
    super("browser", client, MSC, () => new MSC.Device(), trackConsumer);
  }

  /**
   * Play a MediaStreamTrack in the channel.
   * @param type The type of track to play.
   * @param track The track to play, device ID to use, or leave out to use the default user media device.
   */
  public async play(type: ProduceType, track?: MediaStreamTrack | string) {
    switch (type) {
      case "audio": {
        if (this.audioProducer) throw "Already producing audio.";

        try {
          if (!(track instanceof MediaStreamTrack)) {
            if (navigator.mediaDevices === undefined) throw "No media devices.";
            track = (
              await navigator.mediaDevices.getUserMedia({
                audio: track ? { deviceId: track } : true,
              })
            ).getAudioTracks()[0];
          }

          await this.startProduce("audio", track);
        } catch (err) {
          throw "WebRTC Error: " + err;
        }
        break;
      }
    }
  }
}
