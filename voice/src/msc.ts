import type * as browser from "mediasoup-client";
import type * as node from "msc-node";

export type MSCPlatform = "node" | "browser";

/** Utility class to return MSC typings based on platform. */
export interface MediaSoup<Platform extends MSCPlatform> {
  Consumer: Platform extends "node" ? node.types.Consumer : browser.types.Consumer;
  Device: Platform extends "node" ? node.types.Device : browser.types.Device;
  DTLSParameters: Platform extends "node"
    ? node.types.DtlsParameters
    : browser.types.DtlsParameters;
  IceCandidate: Platform extends "node" ? node.types.IceCandidate : browser.types.IceCandidate;
  IceParameters: Platform extends "node" ? node.types.IceParameters : browser.types.IceParameters;
  MediaKind: Platform extends "node" ? node.types.MediaKind : browser.types.MediaKind;
  MediaStreamTrack: Platform extends "node" ? node.MediaStreamTrack : MediaStreamTrack;
  Producer: Platform extends "node" ? node.types.Producer : browser.types.Producer;
  RTPCapabilities: Platform extends "node"
    ? node.types.RtpCapabilities
    : browser.types.RtpCapabilities;
  RTPParameters: Platform extends "node" ? node.types.RtpParameters : browser.types.RtpParameters;
  SCTPParameters: Platform extends "node"
    ? node.types.SctpParameters
    : browser.types.SctpParameters;
  Transport: Platform extends "node" ? node.types.Transport : browser.types.Transport;
}
