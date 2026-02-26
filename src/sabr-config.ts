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
  /** Base64-encoded DASH XML manifest for Shaka Player */
  manifest: string;
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

