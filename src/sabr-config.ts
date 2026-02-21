/**
 * SABR configuration and audio format selection utilities.
 */

import type { SabrFormat } from "googlevideo/shared-types";

/**
 * Audio codec preference order (higher priority first)
 */
const AUDIO_CODEC_PRIORITY: Record<string, number> = {
  opus: 3,
  aac: 2,
  mp4a: 1,
  vorbis: 0,
};

/**
 * SABR streaming information extracted from player response
 */
export interface SabrClientInfo {
  clientName: number;
  clientVersion: string;
  osName: string;
  osVersion: string;
  deviceMake: string;
  deviceModel: string;
}

export interface SabrInfo {
  serverAbrStreamingUrl: string;
  ustreamerConfig: string;
  formats: SabrFormat[];
  durationMs: number;
  visitorData: string;
  clientInfo: SabrClientInfo;
}

/**
 * Parse MIME type to extract codec
 */
export const parseCodec = (mimeType?: string): string | null => {
  if (!mimeType) return null;

  // Format: audio/webm; codecs="opus" or audio/mp4; codecs="mp4a.40.2"
  const codecMatch = mimeType.match(/codecs="([^"]+)"/);
  if (codecMatch) {
    return codecMatch[1].split(".")[0].toLowerCase();
  }

  // Fallback to container type
  if (mimeType.includes("webm")) return "opus";
  if (mimeType.includes("mp4")) return "aac";

  return null;
};

/**
 * Check if a format is audio-only
 */
export const isAudioFormat = (format: SabrFormat): boolean => {
  const mimeType = format.mimeType?.toLowerCase() ?? "";
  return (
    mimeType.startsWith("audio/") ||
    (format.width === undefined && format.height === undefined)
  );
};

/**
 * Get codec priority score
 */
export const getCodecPriority = (mimeType?: string): number => {
  const codec = parseCodec(mimeType);
  if (!codec) return -1;
  return AUDIO_CODEC_PRIORITY[codec] ?? -1;
};

/**
 * Filter formats to audio-only
 */
export const filterAudioFormats = (formats: SabrFormat[]): SabrFormat[] => {
  return formats.filter(isAudioFormat);
};

/**
 * Sort audio formats by preference (Opus > AAC, then by bitrate)
 */
export const sortAudioFormats = (formats: SabrFormat[]): SabrFormat[] => {
  return [...formats].sort((a, b) => {
    // First sort by codec priority
    const priorityA = getCodecPriority(a.mimeType);
    const priorityB = getCodecPriority(b.mimeType);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    // Then by bitrate (higher is better)
    return (b.bitrate ?? 0) - (a.bitrate ?? 0);
  });
};

/**
 * Select the best audio format from available formats
 */
export const selectBestAudioFormat = (
  formats: SabrFormat[]
): SabrFormat | undefined => {
  const audioFormats = filterAudioFormats(formats);
  const sorted = sortAudioFormats(audioFormats);
  return sorted[0];
};

/**
 * Convert FormatStream from youtubei.js to SabrFormat
 */
export const convertToSabrFormat = (format: {
  itag: number;
  last_modified_ms?: string;
  lastModified?: string;
  xtags?: string;
  width?: number;
  height?: number;
  mime_type?: string;
  mimeType?: string;
  audio_quality?: string;
  audioQuality?: string;
  bitrate?: number;
  average_bitrate?: number;
  averageBitrate?: number;
  quality?: string;
  quality_label?: string;
  qualityLabel?: string;
  audio_track?: { id: string };
  audioTrackId?: string;
  is_drc?: boolean;
  isDrc?: boolean;
  approx_duration_ms?: number;
  approxDurationMs?: string | number;
  content_length?: number;
  contentLength?: string | number;
  is_auto_dubbed?: boolean;
  is_descriptive?: boolean;
  is_dubbed?: boolean;
  language?: string | null;
  is_original?: boolean;
  is_secondary?: boolean;
}): SabrFormat => {
  return {
    itag: format.itag,
    lastModified: format.lastModified ?? format.last_modified_ms ?? "",
    xtags: format.xtags,
    width: format.width,
    height: format.height,
    mimeType: format.mimeType ?? format.mime_type,
    audioQuality: format.audioQuality ?? format.audio_quality,
    bitrate: format.bitrate ?? 0,
    averageBitrate: format.averageBitrate ?? format.average_bitrate,
    quality: format.quality,
    qualityLabel: format.qualityLabel ?? format.quality_label,
    audioTrackId: format.audioTrackId ?? format.audio_track?.id,
    isDrc: format.isDrc ?? format.is_drc,
    approxDurationMs: parseApproxDuration(format),
    contentLength: parseContentLength(format),
    isAutoDubbed: format.is_auto_dubbed,
    isDescriptive: format.is_descriptive,
    isDubbed: format.is_dubbed,
    language: format.language,
    isOriginal: format.is_original,
    isSecondary: format.is_secondary,
  };
};

const parseApproxDuration = (format: {
  approx_duration_ms?: number;
  approxDurationMs?: string | number;
}): number => {
  if (typeof format.approxDurationMs === "number") {
    return format.approxDurationMs;
  }
  if (typeof format.approxDurationMs === "string") {
    return parseInt(format.approxDurationMs, 10) || 0;
  }
  return format.approx_duration_ms ?? 0;
};

const parseContentLength = (format: {
  content_length?: number;
  contentLength?: string | number;
}): number | undefined => {
  if (typeof format.contentLength === "number") {
    return format.contentLength;
  }
  if (typeof format.contentLength === "string") {
    return parseInt(format.contentLength, 10) || undefined;
  }
  return format.content_length;
};

/**
 * Create an audio format selector function for SabrStream
 */
export const createAudioFormatSelector = (
  preferOpus: boolean = true
): ((formats: SabrFormat[]) => SabrFormat | undefined) => {
  return (formats: SabrFormat[]) => {
    const audioFormats = filterAudioFormats(formats);

    if (audioFormats.length === 0) {
      return undefined;
    }

    const sorted = sortAudioFormats(audioFormats);

    if (preferOpus) {
      // Find best Opus format first
      const opusFormat = sorted.find((f) => parseCodec(f.mimeType) === "opus");
      if (opusFormat) {
        return opusFormat;
      }
    }

    // Fall back to best available format
    return sorted[0];
  };
};
