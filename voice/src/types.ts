import type { User } from "revkit";
import { MSCPlatform, MediaSoup } from "./msc";

/* Mostly copied from revite's MSC implementation. */

export enum WSEvents {
  UserJoined = "UserJoined",
  UserLeft = "UserLeft",
  UserStartProduce = "UserStartProduce",
  UserStopProduce = "UserStopProduce",
}

export enum WSCommands {
  Authenticate = "Authenticate",
  RoomInfo = "RoomInfo",
  InitializeTransports = "InitializeTransports",
  ConnectTransport = "ConnectTransport",
  StartProduce = "StartProduce",
  StopProduce = "StopProduce",
  StartConsume = "StartConsume",
  StopConsume = "StopConsume",
  SetConsumerPause = "SetConsumerPause",
}

export enum WSErrorCode {
  NotConnected = 0,
  NotFound = 404,

  TransportConnectionFailure = 601,

  ProducerFailure = 611,
  ProducerNotFound = 614,

  ConsumerFailure = 621,
  ConsumerNotFound = 624,
}

export enum WSCloseCode {
  // Sent when the received data is not a string, or is unparseable
  InvalidData = 1003,
  Unauthorized = 4001,
  RoomClosed = 4004,
  // Sent when a client tries to send an opcode in the wrong state
  InvalidState = 1002,
  ServerError = 1011,
}

export interface VoiceError {
  error: WSErrorCode | WSCloseCode;
  message: string;
}

/** Types of data to produce. (only audio supported) */
export type ProduceType = "audio"; //| "video" | "saudio" | "svideo";

/** Response sent back from the websocket when authenticated. */
export interface AuthenticationResult<P extends MSCPlatform> {
  userId: string;
  roomId: string;
  rtpCapabilities: MediaSoup<P>["RTPCapabilities"];
}

/** Data for the current voice channel. */
export interface Room {
  id: string;
  videoAllowed: boolean;
  users: Record<string, VoiceParticipantData>;
}

/** Details about a participant. */
export interface VoiceParticipantData {
  audio?: boolean;
  //video?: boolean,
  //saudio?: boolean,
  //svideo?: boolean,
}
export type VoiceParticipant = { user: User } & Required<VoiceParticipantData>;

/** An incoming stream from a participant. */
export interface VoiceConsumer<P extends MSCPlatform> {
  audio?: { consumer: MediaSoup<P>["Consumer"]; callback: () => any };
  //video?: Consumer,
  //saudio?: Consumer,
  //svideo?: Consumer,
}

export interface TransportInitData<P extends MSCPlatform> {
  id: string;
  iceParameters: MediaSoup<P>["IceParameters"];
  iceCandidates: MediaSoup<P>["IceCandidate"][];
  dtlsParameters: MediaSoup<P>["DTLSParameters"];
  sctpParameters: MediaSoup<P>["SCTPParameters"] | undefined;
}

export interface TransportInitDataTuple<P extends MSCPlatform> {
  sendTransport: TransportInitData<P>;
  recvTransport: TransportInitData<P>;
}

export interface ConsumerData<P extends MSCPlatform> {
  id: string;
  producerId: string;
  kind: MediaSoup<P>["MediaKind"];
  rtpParameters: MediaSoup<P>["RTPParameters"];
}

export enum VoiceStatus {
  UNAVAILABLE,
  UNLOADED,
  LOADING,
  READY,
  CONNECTING,
  AUTHENTICATING,
  RTC_CONNECTING,
  CONNECTED,
}
