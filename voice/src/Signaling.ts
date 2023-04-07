import WebSocket from "@insertish/isomorphic-ws";
import EventEmitter from "eventemitter3";
import type { MSCPlatform, MediaSoup } from "./msc";
import {
  WSCommands,
  WSErrorCode,
  type AuthenticationResult,
  type ConsumerData,
  type ProduceType,
  type Room,
  type TransportInitDataTuple,
} from "./types";

export default class Signaling<Platform extends MSCPlatform> extends EventEmitter<{
  open: (event: WebSocket.Event) => void;
  close: (event: WebSocket.CloseEvent) => void;
  error: (event: WebSocket.Event) => void;
  data: (data: any) => void;
}> {
  public ws: WebSocket | null = null;
  /** Index for pending packets. */
  private index: number = 0;
  /** Pending packets. */
  private pending: Map<number, (data: unknown) => void> = new Map();

  constructor() {
    super();
  }

  connected(): boolean {
    return (
      !!this.ws &&
      this.ws.readyState !== WebSocket.CLOSING &&
      this.ws.readyState !== WebSocket.CLOSED
    );
  }

  connect(address: string): Promise<void> {
    this.disconnect();
    this.ws = new WebSocket(address);
    this.ws.onopen = (e) => this.emit("open", e);
    this.ws.onclose = (e) => this.emit("close", e);
    this.ws.onerror = (e) => this.emit("error", e);
    this.ws.onmessage = (e) => this.parseData(e);

    let finished = false;
    return new Promise((resolve, reject) => {
      this.once("open", () => {
        if (finished) return;
        finished = true;
        resolve();
      });

      this.once("error", () => {
        if (finished) return;
        finished = true;
        reject();
      });
    });
  }

  disconnect() {
    if (
      this.ws &&
      this.ws.readyState !== WebSocket.CLOSED &&
      this.ws.readyState !== WebSocket.CLOSING
    )
      this.ws.close(1000);
  }

  private parseData(event: WebSocket.MessageEvent) {
    if (typeof event.data !== "string") return;
    const json = JSON.parse(event.data);
    const entry = this.pending.get(json.id);
    if (entry === undefined) {
      this.emit("data", json);
      return;
    }
    entry(json);
  }

  private sendRequest(type: string, data?: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
      return Promise.reject({ error: WSErrorCode.NotConnected });

    const ws = this.ws;
    return new Promise((resolve, reject) => {
      if (this.index >= 2 ** 32) this.index = 0;
      while (this.pending.has(this.index)) this.index++;
      const onClose = (e: WebSocket.CloseEvent) => {
        reject({
          error: e.code,
          message: e.reason,
        });
      };

      const finishedFn = (data: any) => {
        this.removeListener("close", onClose);
        if (data.error)
          reject({
            error: data.error,
            message: data.message,
            data: data.data,
          });
        resolve(data.data);
      };

      this.pending.set(this.index, finishedFn);
      this.once("close", onClose);
      const json = {
        id: this.index,
        type,
        data,
      };
      ws.send(`${JSON.stringify(json)}\n`);
      this.index++;
    });
  }

  public authenticate(token: string, roomId: string): Promise<AuthenticationResult<Platform>> {
    return this.sendRequest(WSCommands.Authenticate, { token, roomId });
  }

  public async roomInfo(): Promise<Room> {
    const room = await this.sendRequest(WSCommands.RoomInfo);
    return {
      id: room.id,
      videoAllowed: room.videoAllowed,
      users: room.users,
    };
  }

  initializeTransports(
    rtpCapabilities: MediaSoup<Platform>["RTPCapabilities"]
  ): Promise<TransportInitDataTuple<Platform>> {
    return this.sendRequest(WSCommands.InitializeTransports, {
      mode: "SplitWebRTC",
      rtpCapabilities,
    });
  }

  connectTransport(
    id: string,
    dtlsParameters: MediaSoup<Platform>["DTLSParameters"]
  ): Promise<void> {
    return this.sendRequest(WSCommands.ConnectTransport, {
      id,
      dtlsParameters,
    });
  }

  async startProduce(
    type: ProduceType,
    rtpParameters: MediaSoup<Platform>["RTPParameters"]
  ): Promise<string> {
    const result = await this.sendRequest(WSCommands.StartProduce, {
      type,
      rtpParameters,
    });
    return result.producerId;
  }

  stopProduce(type: ProduceType): Promise<void> {
    return this.sendRequest(WSCommands.StopProduce, { type });
  }

  startConsume(userId: string, type: ProduceType): Promise<ConsumerData<Platform>> {
    return this.sendRequest(WSCommands.StartConsume, { type, userId });
  }

  stopConsume(consumerId: string): Promise<void> {
    return this.sendRequest(WSCommands.StopConsume, { id: consumerId });
  }

  setConsumerPause(consumerId: string, paused: boolean): Promise<void> {
    return this.sendRequest(WSCommands.SetConsumerPause, {
      id: consumerId,
      paused,
    });
  }
}
