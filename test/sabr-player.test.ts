import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { mockApplication } from "./mock-application";
import { SabrStreamingAdapter } from "googlevideo/sabr-streaming-adapter";
import {
  SabrAudioPlayer,
  PlaybackState,
  STALL_TIMEOUT_MS,
  MAX_CONSECUTIVE_STALLS,
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
  // Pending unless a test says otherwise, so playback stays on the cold token.
  mintPoToken: vi.fn(() => new Promise<string>(() => {})),
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
  generateColdStartPoToken: vi.fn(() => "cold-token"),
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
    Player: vi.fn().mockImplementation(function () { return mockShakaPlayer; }),
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
  SabrStreamingAdapter: vi.fn().mockImplementation(function () {
    return {
      attach: vi.fn(),
      dispose: vi.fn(),
      onMintPoToken: vi.fn(),
      onReloadPlayerResponse: vi.fn(),
      setStreamingURL: vi.fn(),
      setUstreamerConfig: vi.fn(),
      setServerAbrFormats: vi.fn(),
    };
  }),
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

  describe("PO tokens", () => {
    const track: Track = {
      apiId: "test-video-id",
      name: "Test Track",
      duration: 180,
    };

    /** The token callback the player gave the adapter it last created. */
    const mintCallback = (): (() => Promise<string>) => {
      const adapter = vi.mocked(SabrStreamingAdapter).mock.results.at(-1)!.value;
      return adapter.onMintPoToken.mock.calls[0][0];
    };

    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    test("should ask the app to mint a token bound to the video", async () => {
      await new SabrAudioPlayer().playTrack(track);

      expect(application.mintPoToken).toHaveBeenCalledWith(
        "https://www.youtube.com",
        "test-video-id"
      );
    });

    test("should use the cold token until the minted one arrives, then keep it", async () => {
      let resolveMint!: (token: string) => void;
      vi.mocked(application.mintPoToken).mockReturnValueOnce(
        new Promise<string>((resolve) => {
          resolveMint = resolve;
        })
      );
      await new SabrAudioPlayer().playTrack(track);
      const mint = mintCallback();

      expect(await mint()).toBe("cold-token");

      resolveMint("minted-token");
      await settle();
      expect(await mint()).toBe("minted-token");
      expect(await mint()).toBe("minted-token");
    });

    test("should stay on the cold token when minting is not available", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(application.mintPoToken).mockRejectedValueOnce({
        message: "Proof-of-origin tokens are not available here",
      });
      await new SabrAudioPlayer().playTrack(track);
      await settle();

      expect(await mintCallback()()).toBe("cold-token");
    });
  });

  describe("stall detection", () => {
    const track: Track = {
      apiId: "test-video-id",
      name: "Test Track",
      duration: 180,
    };

    beforeEach(() => {
      vi.useFakeTimers();
      (global as any).application.createNotification = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("should report and skip a track that stops progressing", async () => {
      const player = new SabrAudioPlayer();
      await player.playTrack(track);
      player.getAudioElement()!.currentTime = 69.5;
      vi.advanceTimersByTime(1000);

      vi.advanceTimersByTime(STALL_TIMEOUT_MS);

      expect(player.getState()).toBe(PlaybackState.ERROR);
      expect(player.getAudioElement()).toBeNull();
      expect(application.createNotification).toHaveBeenCalledWith({
        type: "error",
        message: "Test Track: YouTube stopped sending audio at 1:09",
      });
      expect(application.endTrack).toHaveBeenCalledTimes(1);
    });

    test("should leave the name out of the notification when it is unknown", async () => {
      const player = new SabrAudioPlayer();
      await player.playTrack({ apiId: "test-video-id" } as Track);

      vi.advanceTimersByTime(STALL_TIMEOUT_MS + 1000);

      expect(application.createNotification).toHaveBeenCalledWith({
        type: "error",
        message: "YouTube stopped sending audio at 0:00",
      });
    });

    test("should not treat a paused track as stalled", async () => {
      const player = new SabrAudioPlayer();
      await player.playTrack(track);
      player.pause();

      vi.advanceTimersByTime(STALL_TIMEOUT_MS * 2);

      expect(player.getState()).toBe(PlaybackState.PAUSED);
      expect(application.endTrack).not.toHaveBeenCalled();
    });

    test("should not treat a progressing track as stalled", async () => {
      const player = new SabrAudioPlayer();
      await player.playTrack(track);
      const audio = player.getAudioElement()!;

      for (let i = 0; i < 40; i++) {
        audio.currentTime += 1;
        vi.advanceTimersByTime(1000);
      }

      expect(player.getState()).toBe(PlaybackState.PLAYING);
      expect(application.endTrack).not.toHaveBeenCalled();
    });

    test("should stop skipping after too many stalls in a row", async () => {
      const player = new SabrAudioPlayer();
      for (let i = 0; i < MAX_CONSECUTIVE_STALLS; i++) {
        await player.playTrack(track);
        vi.advanceTimersByTime(STALL_TIMEOUT_MS + 1000);
      }

      expect(application.createNotification).toHaveBeenCalledTimes(
        MAX_CONSECUTIVE_STALLS
      );
      expect(application.endTrack).toHaveBeenCalledTimes(
        MAX_CONSECUTIVE_STALLS - 1
      );
    });

    test("should reload a stalled track from where it stopped on resume", async () => {
      const player = new SabrAudioPlayer();
      await player.playTrack(track);
      player.getAudioElement()!.currentTime = 69.5;
      vi.advanceTimersByTime(STALL_TIMEOUT_MS + 1000);

      await player.resume();

      expect(player.getState()).toBe(PlaybackState.PLAYING);
      expect(player.getCurrentTrack()).toBe(track);
      expect(player.getAudioElement()?.currentTime).toBe(69.5);
    });
  });

  describe("getPlayer", () => {
    test("should return singleton instance", () => {
      const player1 = getPlayer();
      const player2 = getPlayer();
      expect(player1).toBe(player2);
    });

    test("should end the track once when audio ends", async () => {
      const player = getPlayer();
      await player.playTrack({
        apiId: "test-video-id",
        name: "Test Track",
        duration: 180,
      });

      (player.getAudioElement() as any).dispatchEvent("ended");

      expect(application.endTrack).toHaveBeenCalledTimes(1);
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
