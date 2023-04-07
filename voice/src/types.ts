import type { User } from "revkit";
import type {
  MSCConsumer,
  MSCDTLSParameters,
  MSCIceCandidate,
  MSCIceParameters,
  MSCMediaKind,
  MSCRTPCapabilities,
  MSCRTPParameters,
  MSCSCTPParameters,
} from "./msc";

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
export interface AuthenticationResult {
  userId: string;
  roomId: string;
  rtpCapabilities: MSCRTPCapabilities;
}

/** Data for the current voice channel. */
export interface Room {
  id: string;
  videoAllowed: boolean;
  users: Map<string, VoiceParticipantData>;
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
export interface VoiceConsumer {
  audio?: MSCConsumer;
  //video?: Consumer,
  //saudio?: Consumer,
  //svideo?: Consumer,
}

export interface TransportInitData {
  id: string;
  iceParameters: MSCIceParameters;
  iceCandidates: MSCIceCandidate[];
  dtlsParameters: MSCDTLSParameters;
  sctpParameters: MSCSCTPParameters | undefined;
}

export interface TransportInitDataTuple {
  sendTransport: TransportInitData;
  recvTransport: TransportInitData;
}

export interface ConsumerData {
  id: string;
  producerId: string;
  kind: MSCMediaKind;
  rtpParameters: MSCRTPParameters;
}
