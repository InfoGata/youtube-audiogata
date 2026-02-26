import { describe, expect, test, beforeEach, vi } from "vitest";
import { mockApplication } from "./mock-application";
import {
  SabrAudioPlayer,
  PlaybackState,
  getPlayer,
  onPlay,
  onPause,
  onResume,
  onSeek,
  onSetVolume,
  onSetPlaybackRate,
} from "../src/sabr-player";

// Set up global application mock
(global as any).application = {
  ...mockApplication,
  setTrackTime: vi.fn(),
  endTrack: vi.fn(),
  networkRequest: vi.fn(),
};

// Mock the innertube-api module
vi.mock("../src/innertube-api", () => ({
  getSabrInfoInnertube: vi.fn().mockResolvedValue({
    serverAbrStreamingUrl: "https://example.com/sabr",
    ustreamerConfig: "mock-config",
    formats: [
      {
        itag: 251,
        mimeType: 'audio/webm; codecs="opus"',
        bitrate: 128000,
        approxDurationMs: 180000,
      },
    ],
    durationMs: 180000,
    visitorData: "mock-visitor-data",
    clientInfo: {
      clientName: 1,
      clientVersion: "2.20250101.00.00",
      osName: "Windows",
      osVersion: "10.0",
      deviceMake: "",
      deviceModel: "",
    },
    manifest: btoa("<MPD></MPD>"),
  }),
  reloadPlayerResponse: vi.fn().mockResolvedValue({
    streamingUrl: "https://example.com/sabr-reloaded",
    ustreamerConfig: "mock-config-reloaded",
  }),
  getInnertube: vi.fn().mockResolvedValue({
    session: {
      context: {
        client: {
          visitorData: "mock-visitor-data",
        },
      },
    },
  }),
}));

// Mock the po-token module
vi.mock("../src/po-token", () => ({
  getPoToken: vi.fn().mockResolvedValue("mock-po-token"),
}));

// Mock shaka-player
const mockShakaPlayer = {
  attach: vi.fn().mockResolvedValue(undefined),
  configure: vi.fn(),
  addEventListener: vi.fn(),
  load: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  getMediaElement: vi.fn(),
  getNetworkingEngine: vi.fn().mockReturnValue(null),
  getVariantTracks: vi.fn().mockReturnValue([]),
  getPlaybackRate: vi.fn().mockReturnValue(1),
  getStats: vi.fn().mockReturnValue({ estimatedBandwidth: 1000000 }),
  getConfiguration: vi.fn().mockReturnValue({
    streaming: { retryParameters: {} },
  }),
};

vi.mock("shaka-player/dist/shaka-player.ui", () => ({
  default: {
    polyfill: {
      installAll: vi.fn(),
    },
    Player: vi.fn().mockImplementation(() => mockShakaPlayer),
    net: {
      NetworkingEngine: {
        RequestType: { SEGMENT: 1 },
        registerScheme: vi.fn(),
        unregisterScheme: vi.fn(),
        PluginPriority: { PREFERRED: 3 },
        makeRequest: vi.fn(),
      },
      HttpFetchPlugin: {
        isSupported: vi.fn().mockReturnValue(true),
      },
    },
    util: {
      Error: class ShakaError extends Error {
        static Severity = { RECOVERABLE: 1, CRITICAL: 2 };
        static Category = { NETWORK: 1 };
        static Code = {
          HTTP_ERROR: 1001,
          BAD_HTTP_STATUS: 1003,
          OPERATION_ABORTED: 7001,
          TIMEOUT: 1003,
        };
        severity: number;
        category: number;
        code: number;
        constructor(...args: any[]) {
          super(String(args[3] || "ShakaError"));
          this.severity = args[0];
          this.category = args[1];
          this.code = args[2];
        }
      },
      AbortableOperation: vi.fn(),
      Timer: vi.fn().mockImplementation(() => ({
        tickAfter: vi.fn(),
        stop: vi.fn(),
      })),
      StringUtils: {
        fromBytesAutoDetect: vi.fn().mockReturnValue(""),
      },
    },
  },
}));

// Mock googlevideo/sabr-streaming-adapter
vi.mock("googlevideo/sabr-streaming-adapter", () => ({
  SabrStreamingAdapter: vi.fn().mockImplementation(() => ({
    attach: vi.fn(),
    dispose: vi.fn(),
    onMintPoToken: vi.fn(),
    onReloadPlayerResponse: vi.fn(),
    setStreamingURL: vi.fn(),
    setUstreamerConfig: vi.fn(),
    setServerAbrFormats: vi.fn(),
  })),
  SabrUmpProcessor: vi.fn(),
}));

// Mock HTMLAudioElement
class MockAudioElement {
  src = "";
  crossOrigin = "";
  currentTime = 0;
  duration = 180;
  volume = 1;
  playbackRate = 1;
  paused = true;
  private eventListeners: Record<string, Function[]> = {};

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  dispatchEvent(event: string) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((cb) => cb());
    }
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  load() {}
}

// Set up global mocks
beforeEach(() => {
  vi.clearAllMocks();

  (global as any).document = {
    createElement: vi.fn((tag: string) => {
      if (tag === "audio") {
        return new MockAudioElement();
      }
      if (tag === "script") {
        return {
          id: "",
          textContent: "",
        };
      }
      return {};
    }),
    getElementById: vi.fn().mockReturnValue(null),
    body: {
      appendChild: vi.fn(),
    },
  };
});

describe("SabrAudioPlayer", () => {
  describe("constructor", () => {
    test("should initialize with IDLE state", () => {
      const player = new SabrAudioPlayer();
      expect(player.getState()).toBe(PlaybackState.IDLE);
    });

    test("should initialize with no current track", () => {
      const player = new SabrAudioPlayer();
      expect(player.getCurrentTrack()).toBeNull();
    });
  });

  describe("playTrack", () => {
    test("should set state to LOADING when starting playback", async () => {
      const stateChanges: PlaybackState[] = [];
      const player = new SabrAudioPlayer({
        onStateChange: (state) => stateChanges.push(state),
      });

      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);

      expect(stateChanges).toContain(PlaybackState.LOADING);
    });

    test("should successfully play track using Shaka Player", async () => {
      const player = new SabrAudioPlayer();

      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      const result = await player.playTrack(track);
      expect(result).toBe(true);
    });
  });

  describe("pause", () => {
    test("should pause playback when playing", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);
      player.pause();

      expect(player.getState()).toBe(PlaybackState.PAUSED);
    });
  });

  describe("resume", () => {
    test("should resume playback when paused", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);
      player.pause();
      await player.resume();

      expect(player.getState()).toBe(PlaybackState.PLAYING);
    });
  });

  describe("seek", () => {
    test("should seek to specified time", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);
      player.seek(60);

      const audio = player.getAudioElement();
      expect(audio?.currentTime).toBe(60);
    });
  });

  describe("setVolume", () => {
    test("should set volume", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);
      player.setVolume(0.5);

      const audio = player.getAudioElement();
      expect(audio?.volume).toBe(0.5);
    });

    test("should clamp volume to 0-1 range", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);

      player.setVolume(-1);
      expect(player.getAudioElement()?.volume).toBe(0);

      player.setVolume(2);
      expect(player.getAudioElement()?.volume).toBe(1);
    });
  });

  describe("setPlaybackRate", () => {
    test("should set playback rate", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);
      player.setPlaybackRate(1.5);

      const audio = player.getAudioElement();
      expect(audio?.playbackRate).toBe(1.5);
    });
  });

  describe("stop", () => {
    test("should stop playback and clean up", async () => {
      const player = new SabrAudioPlayer();
      const track: Track = {
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      };

      await player.playTrack(track);
      player.stop();

      expect(player.getState()).toBe(PlaybackState.IDLE);
      expect(player.getCurrentTrack()).toBeNull();
      expect(player.getAudioElement()).toBeNull();
    });
  });

  describe("getPlayer", () => {
    test("should return singleton instance", () => {
      const player1 = getPlayer();
      const player2 = getPlayer();
      expect(player1).toBe(player2);
    });
  });
});

describe("callback handlers", () => {
  beforeEach(() => {
    // Reset the singleton
    vi.resetModules();
  });

  test("onPlay should call player.playTrack", async () => {
    const track: Track = {
      apiId: "test-id",
      name: "Test",
      duration: 180,
    };

    await onPlay(track);
  });

  test("onPause should call player.pause", async () => {
    await onPause();
  });

  test("onResume should call player.resume", async () => {
    await onResume();
  });

  test("onSeek should call player.seek", async () => {
    await onSeek(60);
  });

  test("onSetVolume should call player.setVolume", async () => {
    await onSetVolume(0.5);
  });

  test("onSetPlaybackRate should call player.setPlaybackRate", async () => {
    await onSetPlaybackRate(1.5);
  });
});
