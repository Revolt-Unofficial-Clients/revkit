import EventEmitter from "eventemitter3";
import type * as MSCBrowser from "mediasoup-client";
import type * as MSCNode from "msc-node";
import { Client, MiniMapEmitter, VoiceChannel } from "revkit";
import Signaling from "./Signaling";
import type { MSCPlatform, MediaSoup } from "./msc";
import {
  VoiceStatus,
  WSEvents,
  type ProduceType,
  type VoiceConsumer,
  type VoiceError,
  type VoiceParticipant,
} from "./types";

export type VoiceClientConsumer<P extends MSCPlatform> = (
  type: ProduceType,
  track: MediaSoup<P>["MediaStreamTrack"]
) => () => any;

export interface VoiceClientEvents {
  ready: () => void;
  error: (error: Error) => void;
  close: (error?: VoiceError) => void;
  status: (status: VoiceStatus) => void;
  connected: () => void;

  startProduce: (type: ProduceType) => void;
  stopProduce: (type: ProduceType) => void;
  selfDeafenUpdate: (isDeaf: boolean) => void;

  userJoined: (user: VoiceParticipant) => void;
  userLeft: (user: VoiceParticipant) => void;

  userStartProduce: (user: VoiceParticipant, type: ProduceType) => void;
  userStopProduce: (user: VoiceParticipant, type: ProduceType) => void;
}

export class VoiceClient<
  Platform extends MSCPlatform,
  MSC extends MediaSoup<Platform> = MediaSoup<Platform>
> extends EventEmitter<VoiceClientEvents> {
  readonly supported: boolean = false;

  private device?: MSC["Device"];
  private signaling = new Signaling<Platform>();

  private sendTransport: MSC["Transport"] | null = null;
  private recvTransport: MSC["Transport"] | null = null;

  protected consumers = new Map<string, VoiceConsumer<Platform>>();
  protected audioProducer?: MSC["Producer"];

  private _deafened = false;
  public get deafened() {
    return this._deafened;
  }
  public participants = new MiniMapEmitter<VoiceParticipant>();
  public status = VoiceStatus.UNLOADED;
  public get connected() {
    return this.status == VoiceStatus.CONNECTED && !!this.channelID;
  }

  public channelID: string | null = null;
  public get channel() {
    return this.client.channels.get(this.channelID);
  }

  /**
   * The base voice client. It's recommended to use the platform-specific clients instead.
   * @param client The RevKit client to use.
   * @param msc The MediaSoup client to use. (for tree-shaking)
   * @param createDevice A function called to create a new MediaSoup Device for the client.
   * @param consumeTrack A callback that is run to play a new MediaStreamTrack. The function returned will be called when the stream is closed. (leave out to disable consuming media)
   */
  constructor(
    public readonly platform: Platform,
    public client: Client,
    private msc: Platform extends "node" ? typeof MSCNode : typeof MSCBrowser,
    private createDevice: () => MSC["Device"],
    private consumeTrack?: VoiceClientConsumer<Platform>
  ) {
    super();
    this.supported = this.msc.detectDevice() !== undefined;

    this.signaling.on(
      "data",
      async ({ type, data }: { type: WSEvents; data: { id: string; type?: ProduceType } }) => {
        switch (type) {
          case WSEvents.UserJoined: {
            const user = await this.client.users.fetch(data.id);
            if (user) {
              const participant: VoiceParticipant = { user, audio: false };
              this.participants.set(data.id, participant);
              this.participants.fireUpdate([participant]);
              this.emit("userJoined", participant);
            } else this.emit("error", new Error(`Invalid voice channel participant: ${data.id}`));
            break;
          }
          case WSEvents.UserLeft: {
            const participant = this.participants.get(data.id);
            if (!participant) return;
            this.participants.delete(data.id);
            this.participants.fireUpdate([participant]);
            if (this.recvTransport) this.stopConsume(data.id);
            this.emit("userLeft", participant);
            break;
          }
          case WSEvents.UserStartProduce: {
            const participant = this.participants.get(data.id);
            if (!participant || participant.user.id == this.client.user.id) return;
            if (<any>data.type in participant) {
              participant[data.type] = true;
            } else {
              return this.emit(
                "error",
                new Error(
                  `Invalid produce type ${data.type} for ${participant.user.username} (${participant.user.id})`
                )
              );
            }
            this.participants.fireUpdate([participant]);

            if (this.recvTransport) await this.startConsume(data.id, data.type);
            this.emit("userStartProduce", participant, data.type);
            break;
          }
          case WSEvents.UserStopProduce: {
            const participant = this.participants.get(data.id);
            if (!participant) return;
            if (<any>data.type in participant) {
              participant[data.type] = false;
            } else {
              return this.emit(
                "error",
                new Error(
                  `Invalid produce type ${data.type} for ${participant.user.username} (${participant.user.id})`
                )
              );
            }
            this.participants.fireUpdate([participant]);

            if (this.recvTransport) this.stopConsume(data.id, data.type);
            this.emit("userStopProduce", participant, data.type);
            break;
          }
        }
      },
      this
    );

    this.signaling.on(
      "error",
      () => {
        this.emit("error", new Error("Signaling error"));
      },
      this
    );

    this.signaling.on(
      "close",
      (error) => {
        this.disconnectTransport(
          {
            error: error.code,
            message: error.reason,
          },
          true
        );
      },
      this
    );

    if (!this.supported) {
      this.setStatus(VoiceStatus.UNAVAILABLE);
    } else {
      this.setStatus(VoiceStatus.READY);
    }
  }

  private throwIfUnsupported() {
    if (!this.supported) throw new this.msc.types.UnsupportedError("RTC not supported");
  }

  public connectTransport(address: string, roomId: string) {
    this.throwIfUnsupported();
    this.device = this.createDevice();
    this.channelID = roomId;
    return this.signaling.connect(address);
  }

  public disconnectTransport(error?: VoiceError, forceDisconnect = false) {
    if (!this.signaling.connected() && !forceDisconnect) return;
    this.signaling.disconnect();
    this.participants.clear();
    this.participants.fireUpdate([]);
    this.consumers.clear();
    this.channelID = null;

    this.audioProducer = undefined;

    if (this.sendTransport) this.sendTransport.close();
    if (this.recvTransport) this.recvTransport.close();
    this.sendTransport = undefined;
    this.recvTransport = undefined;

    this.emit("close", error);
  }

  async authenticate(token: string) {
    this.throwIfUnsupported();
    if (!this.device || !this.channelID)
      throw new ReferenceError("Voice client is in an invalid state");
    const result = await this.signaling.authenticate(token, this.channelID);
    const [room] = await Promise.all([
      this.signaling.roomInfo(),
      this.device.load({
        routerRtpCapabilities: <any>result.rtpCapabilities,
      }),
    ]);

    // this should really never happen
    if (result.userId !== this.client.user.id)
      this.emit("error", new Error("Authenticated user ID does not match client user ID."));
    await Promise.all(
      Object.entries(room.users).map(async ([id, details]) => {
        const user = await this.client.users.fetch(id);
        if (user) this.participants.set(id, { user, audio: !!details.audio });
        else this.emit("error", new Error(`Invalid voice user: ${id}`));
      })
    );
    this.participants.fireUpdate([...this.participants.values()]);
  }

  async initializeTransports() {
    this.throwIfUnsupported();
    if (!this.device) throw new ReferenceError("Voice client is in an invalid state");
    const initData = await this.signaling.initializeTransports(
      <MSC["RTPCapabilities"]>this.device.rtpCapabilities
    );

    this.sendTransport = <MSC["Transport"]>(
      this.device.createSendTransport(<any>initData.sendTransport)
    );
    this.recvTransport = <MSC["Transport"]>(
      this.device.createRecvTransport(<any>initData.recvTransport)
    );

    const connectTransport = (transport: MSC["Transport"]) => {
      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        this.signaling.connectTransport(transport.id, dtlsParameters).then(callback).catch(errback);
      });
    };

    connectTransport(this.sendTransport);
    connectTransport(this.recvTransport);

    this.sendTransport.on("produce", (parameters, callback, errback) => {
      const type = parameters.appData.type;
      if (parameters.kind === "audio" && type !== "audio" && type !== "saudio")
        return errback?.(new Error("err"));
      if (parameters.kind === "video" && type !== "video" && type !== "svideo")
        return errback?.(new Error("err"));
      this.signaling
        .startProduce(type as any, parameters.rtpParameters)
        .then((id) => callback({ id }))
        .catch(errback);
    });

    this.emit("ready");
    this.participants.forEach(async (p) => {
      if (p.audio && p.user.id !== this.client.user.id) {
        await this.startConsume(p.user.id, "audio");
        this.emit("userStartProduce", p, "audio");
      }
    });
  }

  private async startConsume(userId: string, type: ProduceType) {
    if (!this.consumeTrack) return;
    if (!this.recvTransport) throw new Error("Receive transport undefined");
    const consumers = this.consumers.get(userId) || {};
    const consumerParams = await this.signaling.startConsume(userId, type);
    const consumer = await this.recvTransport.consume(consumerParams);
    switch (type) {
      case "audio":
        if (this.deafened) consumer.pause();
        consumers.audio = {
          consumer: <any>consumer,
          callback: this.consumeTrack(type, <any>consumer),
        };
    }

    await this.signaling.setConsumerPause(consumer.id, false);
    this.consumers.set(userId, consumers);
  }

  private async stopConsume(userId: string, type?: ProduceType) {
    const consumers = this.consumers.get(userId);
    if (!consumers) return;
    if (!type) {
      if (consumers.audio) {
        consumers.audio.consumer.close();
        consumers.audio.callback();
      }
      this.consumers.delete(userId);
    } else {
      switch (type) {
        case "audio": {
          if (consumers.audio) {
            consumers.audio.consumer.close();
            consumers.audio.callback();
            this.signaling.stopConsume(consumers.audio.consumer.id);
          }
          consumers.audio = undefined;
          break;
        }
      }

      this.consumers.set(userId, consumers);
    }
  }

  public async startProduce(type: ProduceType, track: MSC["MediaStreamTrack"]) {
    if (!this.sendTransport) throw new Error("Send transport undefined");
    const producer = await this.sendTransport.produce({
      track: <any>track,
      appData: { type },
    });

    switch (type) {
      case "audio":
        this.audioProducer = <any>producer;
        break;
    }

    const participant = this.participants.get(this.client.user.id);
    if (participant) {
      participant[type] = true;
      this.participants.set(this.client.user.id, participant);
      this.participants.fireUpdate([participant]);
    }

    this.emit("startProduce", type);
  }

  public async stopProduce(type: ProduceType) {
    let producer: MSC["Producer"];
    switch (type) {
      case "audio":
        producer = this.audioProducer;
        this.audioProducer = undefined;
        break;
    }

    if (producer && !producer.closed) {
      producer.close();
      this.emit("stopProduce", type);
    }

    const participant = this.participants.get(this.client.user.id);
    if (participant) {
      participant[type] = false;
      this.participants.set(this.client.user.id, participant);
      this.participants.fireUpdate([participant]);
    }

    try {
      await this.signaling.stopProduce(type);
    } catch (error) {
      if (error.error === "ProducerNotFound") return;
      this.emit("error", error);
    }
  }

  public setStatus(status: VoiceStatus) {
    this.status = status;
    this.emit("status", status);
  }

  public async connect(channel: VoiceChannel) {
    if (this.status > VoiceStatus.READY) return;
    if (!this.supported) throw new Error("RTC is unavailable.");
    if (!channel.isVoice()) throw new Error("Not a voice channel.");
    await this.client.fetchConfiguration();
    const vortexURL = this.client.config?.features.voso?.enabled
      ? this.client.config.features.voso.ws
      : null;
    if (!vortexURL) {
      this.setStatus(VoiceStatus.UNAVAILABLE);
      throw new Error("Vortex is not enabled on target server.");
    }

    this.setStatus(VoiceStatus.CONNECTING);

    try {
      const call = await channel.joinCall();
      await this.connectTransport(channel.client.config.features.voso.ws, channel.id);
      this.setStatus(VoiceStatus.AUTHENTICATING);
      await this.authenticate(call);
      this.setStatus(VoiceStatus.RTC_CONNECTING);
      await this.initializeTransports();
    } catch (err) {
      this.emit("error", err);
      this.setStatus(VoiceStatus.READY);
      return this;
    }

    this.setStatus(VoiceStatus.CONNECTED);
    this.emit("connected");
    return this;
  }

  public disconnect() {
    this.disconnectTransport();
    this.setStatus(VoiceStatus.READY);
  }

  public isProducing(type: ProduceType) {
    switch (type) {
      case "audio":
        return !!this.audioProducer;
      default:
        return false;
    }
  }

  public async startDeafen() {
    if (this.deafened) return;
    this._deafened = true;
    this.consumers.forEach((consumer) => {
      consumer.audio?.consumer.pause();
    });
    this.emit("selfDeafenUpdate", true);
  }
  public async stopDeafen() {
    if (!this.deafened) return;
    this._deafened = false;
    this.consumers.forEach((consumer) => {
      consumer.audio?.consumer.resume();
    });
    this.emit("selfDeafenUpdate", false);
  }
}
