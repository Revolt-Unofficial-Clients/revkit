import EventEmitter from "eventemitter3";
import { Device, Producer, Transport } from "mediasoup-client/lib/types";
import { Client } from "revkit";
import { MiniMapEmitter } from "revkit/dist/es6/utils/MiniEmitter";
import Signaling from "./Signaling";
import { getMSC } from "./msc";
import {
  WSErrorCode,
  WSEvents,
  type ProduceType,
  type VoiceConsumer,
  type VoiceError,
  type VoiceParticipant,
} from "./types";

export class VoiceClient extends EventEmitter<{
  ready: () => void;
  error: (error: Error) => void;
  close: (error?: VoiceError) => void;

  startProduce: (type: ProduceType) => void;
  stopProduce: (type: ProduceType) => void;

  userJoined: (user: VoiceParticipant) => void;
  userLeft: (user: VoiceParticipant) => void;

  userStartProduce: (user: VoiceParticipant, type: ProduceType) => void;
  userStopProduce: (user: VoiceParticipant, type: ProduceType) => void;
}> {
  readonly supported: boolean = getMSC().detectDevice() !== undefined;

  private device?: Device;
  private signaling = new Signaling();

  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;

  private consumers = new Map<string, VoiceConsumer>();

  private _deafened = false;
  public get deafened() {
    return this._deafened;
  }
  public participants = new MiniMapEmitter<VoiceParticipant>();

  userId?: string;
  roomId?: string;

  audioProducer?: Producer;
  constructor(public client: Client) {
    super();

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
            } else throw new Error(`Invalid voice channel participant: ${data.id}`);

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
            if (!participant) return;
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

            if (this.recvTransport) this.startConsume(data.id, data.type);
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
        this.disconnect(
          {
            error: error.code,
            message: error.reason,
          },
          true
        );
      },
      this
    );
  }

  private throwIfUnsupported() {
    if (!this.supported) throw new (getMSC().types.UnsupportedError)("RTC not supported");
  }

  public connect(address: string, roomId: string) {
    this.throwIfUnsupported();
    this.device = new Device();
    this.roomId = roomId;
    return this.signaling.connect(address);
  }

  public disconnect(error?: VoiceError, forceDisconnect = false) {
    if (!this.signaling.connected() && !forceDisconnect) return;
    this.signaling.disconnect();
    this.participants.clear();
    this.participants.fireUpdate([]);
    this.consumers = new Map();
    this.userId = undefined;
    this.roomId = undefined;

    this.audioProducer = undefined;

    if (this.sendTransport) this.sendTransport.close();
    if (this.recvTransport) this.recvTransport.close();
    this.sendTransport = undefined;
    this.recvTransport = undefined;

    this.emit("close", error);
  }

  async authenticate(token: string) {
    this.throwIfUnsupported();
    if (this.device === undefined || this.roomId === undefined)
      throw new ReferenceError("Voice Client is in an invalid state");
    const result = await this.signaling.authenticate(token, this.roomId);
    const [room] = await Promise.all([
      this.signaling.roomInfo(),
      this.device.load({ routerRtpCapabilities: result.rtpCapabilities }),
    ]);

    this.userId = result.userId;
    this.participants = room.users;
  }

  async initializeTransports() {
    this.throwIfUnsupported();
    if (this.device === undefined) throw new ReferenceError("Voice Client is in an invalid state");
    const initData = await this.signaling.initializeTransports(this.device.rtpCapabilities);

    this.sendTransport = this.device.createSendTransport(initData.sendTransport);
    this.recvTransport = this.device.createRecvTransport(initData.recvTransport);

    const connectTransport = (transport: Transport) => {
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
    for (const user of this.participants) {
      if (user[1].audio && user[0] !== this.userId) this.startConsume(user[0], "audio");
    }
  }

  private async startConsume(userId: string, type: ProduceType) {
    if (this.recvTransport === undefined) throw new Error("Receive transport undefined");
    const consumers = this.consumers.get(userId) || {};
    const consumerParams = await this.signaling.startConsume(userId, type);
    const consumer = await this.recvTransport.consume(consumerParams);
    switch (type) {
      case "audio":
        consumers.audio = consumer;
    }

    const mediaStream = new MediaStream([consumer.track]);
    const audio = new Audio();

    audio.onplaying = () => playbtn?.remove();
    const playbtn = document.createElement("div");
    playbtn.innerText = "Click to play audio.";
    playbtn.className = "btn btn-primary absolute";
    playbtn.style.top = "30%";
    playbtn.style.left = "0px";
    document.body.appendChild(playbtn);
    playbtn.onclick = () => {
      playbtn.classList.add("loading");
      audio.play();
    };

    audio.srcObject = mediaStream;
    audio.load();
    audio.play();

    await this.signaling.setConsumerPause(consumer.id, false);
    this.consumers.set(userId, consumers);
  }

  private async stopConsume(userId: string, type?: ProduceType) {
    const consumers = this.consumers.get(userId);
    if (consumers === undefined) return;
    if (type === undefined) {
      if (consumers.audio !== undefined) consumers.audio.close();
      this.consumers.delete(userId);
    } else {
      switch (type) {
        case "audio": {
          if (consumers.audio !== undefined) {
            consumers.audio.close();
            this.signaling.stopConsume(consumers.audio.id);
          }
          consumers.audio = undefined;
          break;
        }
      }

      this.consumers.set(userId, consumers);
    }
  }

  async startProduce(track: MediaStreamTrack, type: ProduceType) {
    if (this.sendTransport === undefined) throw new Error("Send transport undefined");
    const producer = await this.sendTransport.produce({
      track,
      appData: { type },
    });

    switch (type) {
      case "audio":
        this.audioProducer = producer;
        break;
    }

    const participant = this.participants.get(this.userId || "");
    if (participant !== undefined) {
      participant[type] = true;
      this.participants.set(this.userId || "", participant);
    }

    this.emit("startProduce", type);
  }

  async stopProduce(type: ProduceType) {
    let producer;
    switch (type) {
      case "audio":
        producer = this.audioProducer;
        this.audioProducer = undefined;
        break;
    }

    if (producer !== undefined) {
      producer.close();
      this.emit("stopProduce", type);
    }

    const participant = this.participants.get(this.userId || "");
    if (participant !== undefined) {
      participant[type] = false;
      this.participants.set(this.userId || "", participant);
    }

    try {
      await this.signaling.stopProduce(type);
    } catch (error) {
      // eslint-disable-next-line
      if ((error as any).error === WSErrorCode.ProducerNotFound) return;
      throw error;
    }
  }
}
