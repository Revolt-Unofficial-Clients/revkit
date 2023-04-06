import { AttachmentBucket } from "../objects/Attachment";

export interface AutumnConfigTag {
  max_size: number;
  use_ulid: boolean;
  enabled: BooleanConstructor;
  serve_if_field_present: ("object_id" | "message_id" | "user_id")[];
  restrict_content_type?: "Image";
}
export interface AutumnConfig {
  autumn: string;
  tags: { [key in AttachmentBucket]: AutumnConfigTag };
  jpeg_quality: number;
}

export interface JanuaryConfig {
  january: string;
}

export interface VortexConfig {
  vortex: string;
  features: { rtp: boolean };
  ws: string;
}
