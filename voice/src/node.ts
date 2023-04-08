import * as MSC from "msc-node";
import { FFmpeg, VolumeTransformer, opus } from "prism-media";
import type { Client } from "revkit";
import { OggOpusToRtp, RtpOpusToPcm } from "rtp-ogg-opus";
import { Readable } from "stream";
import { VoiceClient as BaseVoiceClient } from "./VoiceClient";
import type { ProduceType, VoiceParticipant } from "./types";

const AUDIO_ENCODING = "s32le",
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
  }

  private transcoder: FFmpeg;
  private volumeTransformer: VolumeTransformer;
  private encoder: opus.Encoder;
  private rtpEncoder: OggOpusToRtp;

  /** Current volume of the player. */
  public get volume() {
    return this.volumeTransformer.volume;
  }
  /** Set the volume of the player. (1 = 100%, 0 = 0%) */
  public setVolume(vol: number) {
    if (vol < 0) vol = 0;
    this.volumeTransformer.setVolume(vol);
  }

  /** Change the extra FFmpeg args used. */
  public setArgs(args?: string[]) {
    this.options.args = args || [];
  }

  /** Resets and destroys old encoders/transformers. */
  public reset() {
    if (this.transcoder) this.transcoder.destroy();
    this.transcoder = new FFmpeg({
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
        ...this.options.args,
      ],
    });
    if (this.volumeTransformer) this.volumeTransformer.destroy();
    this.volumeTransformer = new VolumeTransformer({ type: AUDIO_ENCODING });
    if (this.encoder) this.encoder.destroy();
    this.encoder = new opus.Encoder({
      rate: this.options.sampleRate,
      channels: this.options.audioChannels,
      frameSize: this.options.frameSize,
    });
    if (this.rtpEncoder) this.rtpEncoder.destroy();
    this.rtpEncoder = new OggOpusToRtp({
      sampleRate: this.options.sampleRate,
      payloadType: RTP_PAYLOAD_TYPE,
    });
  }

  public async play(type: ProduceType, stream: Readable) {
    this.reset();
    switch (type) {
      case "audio": {
        // create track sent to vortex
        const MediaTrack = new MSC.MediaStreamTrack({ kind: "audio" }),
          // pipe the stream through transformers
          audio = stream.pipe(this.transcoder).pipe(this.volumeTransformer).pipe(this.encoder);

        const packets: Buffer[] = [],
          sendInterval = this.options.frameSize - this.options.overhead,
          sendPacket = () => {
            try {
              const packet = packets.shift();
              // stop producing audio after all packets sent
              if (!packet) return this.stopProduce("audio");
              // write RTP packet to stream track
              MediaTrack.writeRtp(packet);
              setTimeout(sendPacket, sendInterval);
            } catch (err) {
              // keep going if there's an error
              this.emit("error", err);
              setTimeout(sendPacket, sendInterval);
            }
          };
        this.rtpEncoder.on("data", (packet: Buffer) => {
          if (packet && packet.length > 0) packets.push(packet);
        });
        audio.once("readable", () => {
          // start sending packets after the first one arrives
          setTimeout(sendPacket, sendInterval);
        });
        // start producing track on vortex
        await this.startProduce("audio", MediaTrack);
        // pipe the transformed audio into the encoder
        audio.pipe(this.rtpEncoder);
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

    const rtpDecoder = new RtpOpusToPcm({
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
    return out;
  }
}
