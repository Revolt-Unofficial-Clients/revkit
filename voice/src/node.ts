import { createSocket } from "dgram";
import { unlinkSync, writeFileSync } from "fs";
import * as MSC from "msc-node";
import os from "os";
import path from "path";
import { FFmpeg, VolumeTransformer } from "prism-media";
import { Client } from "revkit";
import { Readable } from "stream";
import { VoiceClient as BaseVoiceClient } from "./VoiceClient";
import type { ProduceType, VoiceClientOptions, VoiceParticipant } from "./types";

const AUDIO_ENCODING = "s16le",
  RTP_PAYLOAD_TYPE = 100,
  PORT_MIN = 5030,
  PORT_MAX = 65535;

/** Options for the node voice client. (most of these don't need changed) */
export interface NodeVoiceClientOptions {
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
  /** Node-specific client options. */
  public options: NodeVoiceClientOptions;
  /** The port used for ffmpeg. */
  public port: number = 5002;

  /**
   * @param options Additional options for the player. Some of them also apply to incoming tracks. (you shouldn't need to mess with these)
   */
  constructor(client: Client | VoiceClientOptions, options: Partial<NodeVoiceClientOptions> = {}) {
    const opts: NodeVoiceClientOptions = {
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
    this.port = await MSC.findPort(PORT_MIN, Math.floor(PORT_MAX / 2), "udp4");
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

  public get baseArgs() {
    return [
      "-ar",
      this.options.sampleRate.toString(),
      "-ac",
      this.options.audioChannels.toString(),
    ];
  }

  /**
   * Resets and destroys old encoders/transformers.
   * @param respawn Respawns the processes. (default true)
   */
  public reset(respawn = true) {
    this.stopProduce("audio");
    if (this.transcoder) this.transcoder.destroy();
    if (respawn) {
      this.transcoder = new FFmpeg({
        args: [
          "-analyzeduration",
          "0",
          "-loglevel",
          "0",
          ...this.baseArgs,
          "-f",
          AUDIO_ENCODING,
          ...this.options.args,
        ],
      });
      this.transcoder.on("error", (err) => {
        if ((<any>err).code == "EPIPE") return;
        this.emit("error", err);
      });
      this.transcoder.process.stderr.on("data", () => {});
    } else delete this.transcoder;
    if (this.volumeTransformer) this.volumeTransformer.destroy();
    if (respawn) {
      this.volumeTransformer = new VolumeTransformer({ type: AUDIO_ENCODING, volume: this.volume });
      this.volumeTransformer.on("error", (err) => {
        this.emit("error", err);
      });
    } else delete this.volumeTransformer;
    if (this.encoder) this.encoder.destroy();
    if (respawn) {
      this.encoder = new FFmpeg({
        args: [
          "-re",
          "-f",
          AUDIO_ENCODING,
          ...this.baseArgs,
          "-i",
          "-",
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "4",
          ...this.baseArgs,
          "-acodec",
          "libopus",
          "-f",
          "rtp",
        ],
        output: `rtp://127.0.0.1:${this.port}`,
      });
      this.encoder.on("error", (err) => {
        if ((<any>err).code == "EPIPE") return;
        this.emit("error", err);
      });
      // fixes stream stopping after 4min
      this.encoder.process.stderr.on("data", () => {});
    } else delete this.encoder;
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
        stream
          .pipe(this.transcoder)
          .pipe(this.volumeTransformer)
          .pipe(this.encoder)
          .once("end", () => {
            socket.close();
            this.reset(false);
          });
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

    // pick a free port (high range) for the rtp socket
    const port = await MSC.findPort(Math.floor(PORT_MAX / 2), PORT_MAX, "udp4"),
      SDP = path.join(os.tmpdir(), `revkitvoice-${port}.sdp`);

    // ffmpeg needs an 'sdp' file to read the RTP packets
    // seems to *require* an actual file
    writeFileSync(
      SDP,
      `c=IN IP4 127.0.0.1
m=audio ${port} RTP/AVP ${RTP_PAYLOAD_TYPE}
a=rtpmap:${RTP_PAYLOAD_TYPE} opus/${this.options.sampleRate}/${this.options.audioChannels}`
    );

    const decoder = new FFmpeg({
        args: [
          "-protocol_whitelist",
          "rtp,file,udp,opus", // whitelist the protocols needed to read the SDP file
          "-i",
          SDP,
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "4",
          ...this.baseArgs,
          "-f",
          "mp3", // it seems to not like other formats
        ],
      }),
      socket = createSocket("udp4");
    decoder.on("error", (err) => {
      if ((<any>err).code == "EPIPE") return;
      this.emit("error", err);
    });

    const track = producer[type].consumer.track;
    if (!track) return null;
    if (track.onReceiveRtp.ended) return; // if the user unmuted and muted too quickly

    track.onReceiveRtp.subscribe((packet) => {
      // if the decoder is destroyed, stop sending packets to it
      if (decoder.destroyed) return cancel(participant, type);
      try {
        socket.send(packet.serialize(), port, "127.0.0.1");
      } catch (err) {
        this.emit("error", err);
      }
    });

    const cancel = (p: VoiceParticipant, t: ProduceType) => {
      if (p.user.id !== participant.user.id || t !== type) return;
      this.off("userStopProduce", cancel);
      if (!track.onReceiveRtp.ended) track.onReceiveRtp.allUnsubscribe();
      decoder.emit("end");
      decoder.destroy();
      unlinkSync(SDP); // make sure we remove the temp sdp file
    };

    // listen for this user to stop talking
    this.on("userStopProduce", cancel);
    return decoder;
  }
}
