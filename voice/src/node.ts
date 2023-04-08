import { createSocket } from "dgram";
import * as MSC from "msc-node";
import { FFmpeg, VolumeTransformer } from "prism-media";
import type { Client } from "revkit";
import { Readable } from "stream";
import { VoiceClient as BaseVoiceClient } from "./VoiceClient";
import type { ProduceType, VoiceParticipant } from "./types";

const AUDIO_ENCODING = "s16le",
  RTP_PAYLOAD_TYPE = 100;

export interface VoiceClientOptions {
  /** Additional FFmpeg args to use. */
  args: string[];
  /** Number of channels for the audio played. (default 2) */
  audioChannels: 1 | 2;
  /**
   * Size of each audio packet in ms. (default 960) (must match sample rate)
   * Read [this](https://www.opus-codec.org/docs/html_api/group__opusencoder.html#ga88621a963b809ebfc27887f13518c966) documentation.
   */
  frameSize: number;
  /** Milliseconds of extra audio data to be sent in each packet. Increase if there are delays. (default 100) */
  overhead: number;
  /** Sample rate for tracks played. (default 48,000) */
  sampleRate: number;
}

/**
 * A VoiceClient implementation for use with node.js.
 */
export default class VoiceClient extends BaseVoiceClient<"node"> {
  public options: VoiceClientOptions;
  public port: number = 5002;

  /**
   * @param client The RevKit client to use.
   * @param options Additional options for the player. Some of them also apply to incoming tracks. (you shouldn't need to mess with these)
   */
  constructor(client: Client, options: Partial<VoiceClientOptions> = {}) {
    const opts: VoiceClientOptions = {
      args: [],
      audioChannels: 2,
      frameSize: 960,
      overhead: 100,
      sampleRate: 48000,
      ...options,
    };
    super(
      "node",
      client,
      MSC,
      () =>
        new MSC.Device({
          headerExtensions: {
            audio: [MSC.useSdesMid()],
          },
          codecs: {
            audio: [
              new MSC.RTCRtpCodecParameters({
                mimeType: "audio/opus",
                clockRate: opts.sampleRate,
                payloadType: RTP_PAYLOAD_TYPE,
                channels: opts.audioChannels,
              }),
            ],
          },
        }),
      () => () => {}
    );
    this.options = opts;
    this.resetPort();
  }
  public async resetPort() {
    this.port = await MSC.findPort(5030, 65535, "udp4");
  }

  private transcoder: FFmpeg;
  private volumeTransformer: VolumeTransformer;
  private encoder: FFmpeg;

  /** Current volume of the player. */
  public get volume() {
    return this._volume;
  }
  private _volume = 1;
  /** Set the volume of the player. (1 = 100%, 0 = 0%) */
  public setVolume(vol: number) {
    if (vol < 0) vol = 0;
    this.volumeTransformer?.setVolume(vol);
    this._volume = vol;
  }

  /** Change the extra FFmpeg args used. */
  public setArgs(args?: string[]) {
    this.options.args = args || [];
  }

  /** Resets and destroys old encoders/transformers. */
  public reset() {
    const baseArgs = [
      "-ar",
      this.options.sampleRate.toString(),
      "-ac",
      this.options.audioChannels.toString(),
    ];
    if (this.transcoder) this.transcoder.destroy();
    this.transcoder = new FFmpeg({
      args: ["-analyzeduration", "0", "-loglevel", "0", ...baseArgs, "-f", AUDIO_ENCODING],
    });
    if (this.volumeTransformer) this.volumeTransformer.destroy();
    this.volumeTransformer = new VolumeTransformer({ type: AUDIO_ENCODING, volume: this.volume });
    if (this.encoder) this.encoder.destroy();
    this.encoder = new FFmpeg({
      args: [
        "-re",
        "-f",
        AUDIO_ENCODING,
        ...baseArgs,
        "-i",
        "-",
        "-reconnect",
        "1",
        "-reconnect_streamed",
        "1",
        "-reconnect_delay_max",
        "4",
        ...baseArgs,
        "-acodec",
        "libopus",
        ...this.options.args,
        "-f",
        "rtp",
      ],
      output: `rtp://127.0.0.1:${this.port}`,
    });
    this.encoder.on("data", () => {});
    this.encoder.on("error", (err) => {
      if ((<any>err).code == "EPIPE") return;
      this.emit("error", err);
    });
  }

  public async play(type: ProduceType, stream: Readable) {
    await this.resetPort();
    this.reset();
    switch (type) {
      case "audio": {
        // create track sent to vortex
        const MediaTrack = new MSC.MediaStreamTrack({ kind: "audio" });

        // create UDP socket to output RTP packets
        const socket = createSocket("udp4");
        socket.bind(this.port);
        socket.on("message", (data) => {
          MediaTrack.writeRtp(data);
        });

        // start producing track on vortex
        await this.startProduce("audio", MediaTrack);

        // pipe the stream through transformers
        stream.pipe(this.transcoder).pipe(this.volumeTransformer).pipe(this.encoder);
      }
    }
  }

  /**
   * Listen to a voice participant.
   * @returns A `Readable` stream of audio data. Will be `null` if the user is not producing that track.
   */
  public async listenTo(
    participant: VoiceParticipant,
    type: ProduceType
  ): Promise<Readable | null> {
    const producer = this.consumers.get(participant.user.id);
    if (!producer || !producer[type]) return null;

    /*  const rtpDecoder = new RtpOpusToPcm({
        sampleRate: this.options.sampleRate,
        channels: this.options.audioChannels,
      }),
      decoder = new opus.Decoder({
        rate: this.options.sampleRate,
        channels: this.options.audioChannels,
        frameSize: this.options.frameSize,
      }),
      ffmpeg = new FFmpeg({
        args: [
          "-analyzeduration",
          "0",
          "-loglevel",
          "0",
          "-f",
          AUDIO_ENCODING,
          "-ar",
          this.options.sampleRate.toString(),
          "-ac",
          this.options.audioChannels.toString(),
        ],
      });

    const track = producer[type].consumer.track;
    if (!track) return null;

    track.onReceiveRtp.subscribe((packet) => {
      if (decoder.destroyed) return cancel(participant, type);
      try {
        decoder.write(packet.serialize());
      } catch (err) {
        this.emit("error", err);
      }
    });

    const cancel = (p: VoiceParticipant, t: ProduceType) => {
      if (p.user.id !== participant.user.id || t !== type) return;
      this.off("userStopProduce", cancel);
      track.onReceiveRtp.allUnsubscribe();
      rtpDecoder.destroy();
      decoder.destroy();
      ffmpeg.destroy();
      out.destroy();
    };

    this.on("userStopProduce", cancel);

    const out = rtpDecoder.pipe(decoder).pipe(ffmpeg);
    return out;*/
  }
}
