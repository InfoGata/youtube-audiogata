/**
 * SABR Audio Player for YouTube audio streaming.
 * Uses Shaka Player + SabrStreamingAdapter for segment-based streaming
 * with native seeking support.
 */

import shaka from "shaka-player/dist/shaka-player.ui";
import { SabrStreamingAdapter } from "googlevideo/sabr-streaming-adapter";
import { ShakaPlayerAdapter } from "./ShakaPlayerAdapter";
import { getSabrInfoInnertube, reloadPlayerResponse, getInnertube } from "./innertube-api";
import { generateColdStartPoToken } from "./po-token";

/**
 * Create a fetch function that routes through application.networkRequest
 * and handles binary body data properly for the AudioGata sandbox.
 */
const createNetworkFetch = (): typeof fetch => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);

    // Handle binary body data - convert Uint8Array to Blob for proper transmission
    let body: BodyInit | null | undefined = init?.body;
    if (init?.body instanceof Uint8Array) {
      const buf = init.body;
      const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      body = new Blob([arrayBuffer], { type: "application/x-protobuf" });
    } else if (init?.body instanceof ArrayBuffer) {
      body = new Blob([init.body], { type: "application/x-protobuf" });
    }

    const modifiedInit: RequestInit = {
      ...init,
      headers,
      body,
    };

    // SabrStream / Shaka may pass URL objects; convert to string for networkRequest
    const urlStr = input instanceof URL ? input.toString() : input;
    return application.networkRequest(urlStr as RequestInfo, modifiedInit);
  };
};

/**
 * Playback state enumeration
 */
export enum PlaybackState {
  IDLE = "idle",
  LOADING = "loading",
  PLAYING = "playing",
  PAUSED = "paused",
  ENDED = "ended",
  ERROR = "error",
}

/** Where proof-of-origin tokens for this plugin are minted. */
const YOUTUBE_ORIGIN = "https://www.youtube.com";

/**
 * How long playback may go without progressing before it is treated as failed.
 * SABR backs off for a few seconds between requests, so this has to be well
 * above that.
 */
export const STALL_TIMEOUT_MS = 20_000;

/**
 * Stalled tracks in a row after which the player stops skipping to the next
 * one, so a queue on repeat that YouTube won't serve doesn't cycle forever.
 */
export const MAX_CONSECUTIVE_STALLS = 3;

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Player event callbacks
 */
export interface SabrPlayerCallbacks {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onStateChange?: (state: PlaybackState) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

/**
 * SABR Audio Player class
 * Uses Shaka Player with SabrStreamingAdapter for segment-based audio streaming.
 * Shaka handles seeking by requesting the correct segment automatically.
 */
export class SabrAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private player: shaka.Player | null = null;
  private sabrAdapter: SabrStreamingAdapter | null = null;
  private shakaPlayerAdapter: ShakaPlayerAdapter | null = null;
  private currentTrack: Track | null = null;
  private state: PlaybackState = PlaybackState.IDLE;
  private callbacks: SabrPlayerCallbacks = {};
  private stallTimer: ReturnType<typeof setInterval> | null = null;
  private lastProgressTime = 0;
  private lastProgressAt = 0;
  private consecutiveStalls = 0;
  // Where playback stalled, so resume can load the track again from there
  private stalledAt: { track: Track; time: number } | null = null;

  constructor(callbacks: SabrPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Get the current playback state
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Get the current track
   */
  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  /**
   * Get the audio element (for direct manipulation if needed)
   */
  getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  /**
   * Play a track using SABR streaming via Shaka Player
   */
  async playTrack(track: Track): Promise<boolean> {
    // Stop any current playback
    this.stop();

    this.stalledAt = null;
    this.currentTrack = track;
    this.setState(PlaybackState.LOADING);

    try {
      await this.initShakaPlayback(track);
      return true;
    } catch (error) {
      console.error("Playback error:", error);
      this.setState(PlaybackState.ERROR);
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * Initialize Shaka Player with SabrStreamingAdapter
   */
  private async initShakaPlayback(track: Track): Promise<void> {
    if (!track.apiId) {
      throw new Error("Track does not have a valid API ID");
    }

    // Get SABR info from Innertube (includes DASH manifest)
    const sabrInfo = await getSabrInfoInnertube(track.apiId);
    if (!sabrInfo) {
      throw new Error("Failed to retrieve SABR info for track: " + track.apiId);
    }

    // Install Shaka polyfills
    shaka.polyfill.installAll();

    // Create audio element
    this.audio = document.createElement("audio");
    this.audio.crossOrigin = "anonymous";

    // Time update handler
    this.audio.addEventListener("timeupdate", () => {
      if (this.audio) {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        this.callbacks.onTimeUpdate?.(currentTime, duration);
        application.setTrackTime(currentTime);
      }
    });

    // Ended handler
    this.audio.addEventListener("ended", () => {
      this.consecutiveStalls = 0;
      this.setState(PlaybackState.ENDED);
      this.callbacks.onEnded?.();
      application.endTrack();
    });

    // Error handler
    this.audio.addEventListener("error", (e) => {
      console.error("Audio element error:", e);
      this.setState(PlaybackState.ERROR);
      this.callbacks.onError?.(new Error("Audio playback error"));
    });

    // Create Shaka Player and attach to audio element
    this.player = new shaka.Player();
    await this.player.attach(this.audio);

    // Configure Shaka for audio streaming
    this.player.configure({
      abr: {
        enabled: true,
      },
      streaming: {
        bufferingGoal: 120,
        rebufferingGoal: 2,
      },
    });

    // Do NOT register a global "error" event listener on the Shaka Player.
    // SABR streaming produces RECOVERABLE errors during normal operation
    // (e.g., redirects, context updates). Shaka handles these internally
    // via retries. Treating them as fatal kills playback on seek.

    // Create ShakaPlayerAdapter and set fetch function
    this.shakaPlayerAdapter = new ShakaPlayerAdapter();
    this.shakaPlayerAdapter.setFetchFunction(createNetworkFetch());

    // Build client info for SABR adapter
    const clientInfo = {
      clientName: sabrInfo.clientInfo.clientName,
      clientVersion: sabrInfo.clientInfo.clientVersion,
      osName: sabrInfo.clientInfo.osName,
      osVersion: sabrInfo.clientInfo.osVersion,
      deviceMake: sabrInfo.clientInfo.deviceMake,
      deviceModel: sabrInfo.clientInfo.deviceModel,
    };

    // Create SabrStreamingAdapter
    this.sabrAdapter = new SabrStreamingAdapter({
      playerAdapter: this.shakaPlayerAdapter,
      clientInfo,
    });

    // PO tokens. Requests start with a cold start token, which YouTube honours
    // for about a minute of most videos, while the app mints a full one on
    // youtube.com. Once that arrives, every later request uses it: YouTube
    // expects the token to change at most once. Without minting (no extension,
    // or a platform that lacks it) the cold token is all there is, and the
    // stall watchdog reports where YouTube stops.
    const coldToken = (async () => {
      try {
        const youtube = await getInnertube();
        const visitorData = youtube.session?.context?.client?.visitorData ?? "";
        return generateColdStartPoToken(visitorData);
      } catch (error) {
        console.warn("Failed to make a cold start PO token:", error);
        return "";
      }
    })();
    let mintedToken: string | undefined;
    application.mintPoToken(YOUTUBE_ORIGIN, track.apiId).then(
      (token) => {
        mintedToken = token;
      },
      (error) => {
        console.warn(
          "PO token minting is not available:",
          error?.message ?? error
        );
      }
    );
    // Called with no args before every request
    this.sabrAdapter.onMintPoToken(async () => mintedToken ?? (await coldToken));

    // Register reload player response callback
    // Called with reloadPlaybackContext, must update adapter state and resolve
    const sabrAdapter = this.sabrAdapter;
    const videoId = track.apiId!;
    this.sabrAdapter.onReloadPlayerResponse(async (reloadContext) => {
      console.log("Requesting player response reload...");
      const result = await reloadPlayerResponse(videoId, reloadContext);
      sabrAdapter.setStreamingURL(result.streamingUrl);
      if (result.ustreamerConfig) {
        sabrAdapter.setUstreamerConfig(result.ustreamerConfig);
      }
    });

    // Attach SABR adapter to Shaka Player
    this.sabrAdapter.attach(this.player);

    // Set streaming URL, ustreamer config, and formats
    this.sabrAdapter.setStreamingURL(sabrInfo.serverAbrStreamingUrl);
    this.sabrAdapter.setUstreamerConfig(sabrInfo.ustreamerConfig);
    this.sabrAdapter.setServerAbrFormats(sabrInfo.formats);

    // Load the DASH manifest
    await this.player.load(
      `data:application/dash+xml;base64,${sabrInfo.manifest}`
    );

    // Start playback
    await this.audio.play();
    this.setState(PlaybackState.PLAYING);
    this.startStallWatch();
  }

  /**
   * SABR can stop sending media without any error reaching the audio element
   * or Shaka (e.g. when YouTube wants attestation), which leaves the track
   * silently frozen. Treat a long enough lack of progress as a failure.
   */
  private startStallWatch(): void {
    this.stopStallWatch();
    this.markProgress();
    this.stallTimer = setInterval(() => {
      const audio = this.audio;
      if (!audio || this.state !== PlaybackState.PLAYING || audio.paused) {
        this.markProgress();
        return;
      }
      if (audio.currentTime !== this.lastProgressTime) {
        this.markProgress();
        return;
      }
      if (Date.now() - this.lastProgressAt >= STALL_TIMEOUT_MS) {
        this.onStall();
      }
    }, 1000);
  }

  private stopStallWatch(): void {
    if (this.stallTimer) {
      clearInterval(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private markProgress(): void {
    this.lastProgressTime = this.audio?.currentTime ?? 0;
    this.lastProgressAt = Date.now();
  }

  private onStall(): void {
    const track = this.currentTrack;
    const time = this.audio?.currentTime ?? 0;
    this.stop();
    if (!track) return;

    this.stalledAt = { track, time };
    this.consecutiveStalls++;
    this.setState(PlaybackState.ERROR);
    const error = new Error(
      `YouTube stopped sending audio at ${formatTime(time)}`
    );
    this.callbacks.onError?.(error);
    // The app's onPlay request only carries the apiId, not the name
    application.createNotification({
      type: "error",
      message: track.name ? `${track.name}: ${error.message}` : error.message,
    });
    if (this.consecutiveStalls < MAX_CONSECUTIVE_STALLS) {
      application.endTrack();
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audio && this.state === PlaybackState.PLAYING) {
      this.audio.pause();
      this.setState(PlaybackState.PAUSED);
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.audio && this.state === PlaybackState.PAUSED) {
      await this.audio.play();
      this.setState(PlaybackState.PLAYING);
    } else if (this.stalledAt) {
      // The stream is gone, so load the track again from where it stopped
      const { track, time } = this.stalledAt;
      if (await this.playTrack(track)) {
        this.seek(time);
      }
    }
  }

  /**
   * Seek to a specific time.
   * Shaka Player handles segment requests for the target time automatically.
   */
  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
      this.markProgress();
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  /**
   * Stop playback and clean up all resources
   */
  stop(): void {
    this.stopStallWatch();

    // Dispose SABR adapter
    if (this.sabrAdapter) {
      this.sabrAdapter.dispose();
      this.sabrAdapter = null;
    }

    // Dispose Shaka player adapter
    if (this.shakaPlayerAdapter) {
      this.shakaPlayerAdapter.dispose();
      this.shakaPlayerAdapter = null;
    }

    // Destroy Shaka player
    if (this.player) {
      this.player.destroy().catch((err) => {
        console.error("Error destroying Shaka player:", err);
      });
      this.player = null;
    }

    // Clean up audio element
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }

    // Reset state
    this.currentTrack = null;
    this.setState(PlaybackState.IDLE);
  }

  /**
   * Set the playback state
   */
  private setState(state: PlaybackState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }
}

// Singleton instance for the plugin
let playerInstance: SabrAudioPlayer | null = null;

/**
 * Get the SABR player instance
 */
export const getPlayer = (): SabrAudioPlayer => {
  if (!playerInstance) {
    // The player reports time and track end to the application itself; doing
    // it here too would call endTrack twice and skip a track.
    playerInstance = new SabrAudioPlayer({
      onError: (error) => {
        console.error("SABR Player error:", error);
      },
    });
  }
  return playerInstance;
};

/**
 * Handler for onPlay callback
 */
export const onPlay = async (track: Track): Promise<void> => {
  const player = getPlayer();
  console.log("onPlay called with track:", track);
  await player.playTrack(track);
  console.log("onPlay completed with track:", track);
};

/**
 * Handler for onPause callback
 */
export const onPause = async (): Promise<void> => {
  const player = getPlayer();
  player.pause();
};

/**
 * Handler for onResume callback
 */
export const onResume = async (): Promise<void> => {
  const player = getPlayer();
  await player.resume();
};

/**
 * Handler for onSeek callback
 */
export const onSeek = async (time: number): Promise<void> => {
  const player = getPlayer();
  console.log("onSeek called with time:", time);
  player.seek(time);
};

/**
 * Handler for onSetVolume callback
 */
export const onSetVolume = async (volume: number): Promise<void> => {
  const player = getPlayer();
  player.setVolume(volume);
};

/**
 * Handler for onSetPlaybackRate callback
 */
export const onSetPlaybackRate = async (rate: number): Promise<void> => {
  const player = getPlayer();
  player.setPlaybackRate(rate);
};
