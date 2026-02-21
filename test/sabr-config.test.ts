import { describe, expect, test } from "vitest";
import type { SabrFormat } from "googlevideo/shared-types";
import {
  parseCodec,
  isAudioFormat,
  getCodecPriority,
  filterAudioFormats,
  sortAudioFormats,
  selectBestAudioFormat,
  convertToSabrFormat,
  createAudioFormatSelector,
} from "../src/sabr-config";

const createMockAudioFormat = (
  overrides: Partial<SabrFormat> = {}
): SabrFormat => ({
  itag: 140,
  lastModified: "1234567890",
  bitrate: 128000,
  approxDurationMs: 180000,
  mimeType: 'audio/mp4; codecs="mp4a.40.2"',
  ...overrides,
});

const createMockVideoFormat = (
  overrides: Partial<SabrFormat> = {}
): SabrFormat => ({
  itag: 137,
  lastModified: "1234567890",
  bitrate: 4000000,
  approxDurationMs: 180000,
  mimeType: 'video/mp4; codecs="avc1.640028"',
  width: 1920,
  height: 1080,
  ...overrides,
});

describe("sabr-config", () => {
  describe("parseCodec", () => {
    test("should parse opus codec", () => {
      expect(parseCodec('audio/webm; codecs="opus"')).toBe("opus");
    });

    test("should parse aac codec", () => {
      expect(parseCodec('audio/mp4; codecs="mp4a.40.2"')).toBe("mp4a");
    });

    test("should handle webm container fallback", () => {
      expect(parseCodec("audio/webm")).toBe("opus");
    });

    test("should handle mp4 container fallback", () => {
      expect(parseCodec("audio/mp4")).toBe("aac");
    });

    test("should return null for undefined", () => {
      expect(parseCodec(undefined)).toBeNull();
    });

    test("should return null for unknown format", () => {
      expect(parseCodec("unknown/format")).toBeNull();
    });
  });

  describe("isAudioFormat", () => {
    test("should identify audio format by mimeType", () => {
      const format = createMockAudioFormat();
      expect(isAudioFormat(format)).toBe(true);
    });

    test("should identify video format", () => {
      const format = createMockVideoFormat();
      expect(isAudioFormat(format)).toBe(false);
    });

    test("should identify audio format without dimensions", () => {
      const format = createMockAudioFormat({
        mimeType: undefined,
        width: undefined,
        height: undefined,
      });
      expect(isAudioFormat(format)).toBe(true);
    });
  });

  describe("getCodecPriority", () => {
    test("should rank opus highest", () => {
      expect(getCodecPriority('audio/webm; codecs="opus"')).toBe(3);
    });

    test("should rank aac second", () => {
      expect(getCodecPriority("audio/mp4")).toBe(2);
    });

    test("should rank mp4a third", () => {
      expect(getCodecPriority('audio/mp4; codecs="mp4a.40.2"')).toBe(1);
    });

    test("should return -1 for unknown", () => {
      expect(getCodecPriority("unknown")).toBe(-1);
    });
  });

  describe("filterAudioFormats", () => {
    test("should filter out video formats", () => {
      const formats = [
        createMockAudioFormat({ itag: 140 }),
        createMockVideoFormat({ itag: 137 }),
        createMockAudioFormat({ itag: 251 }),
      ];

      const audioFormats = filterAudioFormats(formats);
      expect(audioFormats).toHaveLength(2);
      expect(audioFormats.every((f) => f.width === undefined)).toBe(true);
    });
  });

  describe("sortAudioFormats", () => {
    test("should sort by codec priority first", () => {
      const formats = [
        createMockAudioFormat({
          itag: 140,
          mimeType: 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: 256000,
        }),
        createMockAudioFormat({
          itag: 251,
          mimeType: 'audio/webm; codecs="opus"',
          bitrate: 128000,
        }),
      ];

      const sorted = sortAudioFormats(formats);
      expect(sorted[0].itag).toBe(251); // Opus first despite lower bitrate
    });

    test("should sort by bitrate when same codec", () => {
      const formats = [
        createMockAudioFormat({
          itag: 250,
          mimeType: 'audio/webm; codecs="opus"',
          bitrate: 64000,
        }),
        createMockAudioFormat({
          itag: 251,
          mimeType: 'audio/webm; codecs="opus"',
          bitrate: 128000,
        }),
      ];

      const sorted = sortAudioFormats(formats);
      expect(sorted[0].itag).toBe(251); // Higher bitrate first
    });
  });

  describe("selectBestAudioFormat", () => {
    test("should select opus format over aac", () => {
      const formats = [
        createMockAudioFormat({
          itag: 140,
          mimeType: 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: 256000,
        }),
        createMockAudioFormat({
          itag: 251,
          mimeType: 'audio/webm; codecs="opus"',
          bitrate: 128000,
        }),
        createMockVideoFormat({ itag: 137 }),
      ];

      const best = selectBestAudioFormat(formats);
      expect(best?.itag).toBe(251);
    });

    test("should return undefined for empty array", () => {
      expect(selectBestAudioFormat([])).toBeUndefined();
    });

    test("should return undefined for only video formats", () => {
      const formats = [createMockVideoFormat()];
      expect(selectBestAudioFormat(formats)).toBeUndefined();
    });
  });

  describe("convertToSabrFormat", () => {
    test("should convert youtubei.js format to SabrFormat", () => {
      const input = {
        itag: 140,
        last_modified_ms: "1234567890",
        mime_type: 'audio/mp4; codecs="mp4a.40.2"',
        audio_quality: "AUDIO_QUALITY_MEDIUM",
        bitrate: 128000,
        average_bitrate: 127000,
        approx_duration_ms: 180000,
        content_length: 2880000,
      };

      const result = convertToSabrFormat(input);

      expect(result.itag).toBe(140);
      expect(result.lastModified).toBe("1234567890");
      expect(result.mimeType).toBe('audio/mp4; codecs="mp4a.40.2"');
      expect(result.audioQuality).toBe("AUDIO_QUALITY_MEDIUM");
      expect(result.bitrate).toBe(128000);
      expect(result.averageBitrate).toBe(127000);
      expect(result.approxDurationMs).toBe(180000);
      expect(result.contentLength).toBe(2880000);
    });

    test("should handle camelCase properties", () => {
      const input = {
        itag: 251,
        lastModified: "9876543210",
        mimeType: 'audio/webm; codecs="opus"',
        audioQuality: "AUDIO_QUALITY_HIGH",
        bitrate: 160000,
        averageBitrate: 155000,
        approxDurationMs: "240000",
        contentLength: "4800000",
      };

      const result = convertToSabrFormat(input);

      expect(result.itag).toBe(251);
      expect(result.lastModified).toBe("9876543210");
      expect(result.approxDurationMs).toBe(240000);
      expect(result.contentLength).toBe(4800000);
    });
  });

  describe("createAudioFormatSelector", () => {
    test("should prefer opus when preferOpus is true", () => {
      const selector = createAudioFormatSelector(true);
      const formats = [
        createMockAudioFormat({
          itag: 140,
          mimeType: 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: 256000,
        }),
        createMockAudioFormat({
          itag: 251,
          mimeType: 'audio/webm; codecs="opus"',
          bitrate: 128000,
        }),
      ];

      const selected = selector(formats);
      expect(selected?.itag).toBe(251);
    });

    test("should select best format when no opus available", () => {
      const selector = createAudioFormatSelector(true);
      const formats = [
        createMockAudioFormat({
          itag: 140,
          mimeType: 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: 128000,
        }),
        createMockAudioFormat({
          itag: 141,
          mimeType: 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: 256000,
        }),
      ];

      const selected = selector(formats);
      expect(selected?.itag).toBe(141); // Higher bitrate
    });

    test("should return undefined for empty formats", () => {
      const selector = createAudioFormatSelector();
      expect(selector([])).toBeUndefined();
    });
  });
});
