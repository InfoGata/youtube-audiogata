/**
 * SABR Audio Player for YouTube audio streaming.
 * Uses Shaka Player + SabrStreamingAdapter for segment-based streaming
 * with native seeking support.
 */

import shaka from "shaka-player/dist/shaka-player.ui";
import { SabrStreamingAdapter } from "googlevideo/sabr-streaming-adapter";
import { ShakaPlayerAdapter } from "./ShakaPlayerAdapter";
import { getSabrInfoInnertube, reloadPlayerResponse, getInnertube } from "./innertube-api";
import { getPoToken } from "./po-token";

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

    // Register PO token callback — called with no args, returns PO token string
    this.sabrAdapter.onMintPoToken(async () => {
      try {
        const youtube = await getInnertube();
        const visitorData = youtube.session?.context?.client?.visitorData ?? "";
        return await getPoToken(visitorData, true);
      } catch (error) {
        console.warn("Failed to mint PO token:", error);
        return "";
      }
    });

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
    }
  }

  /**
   * Seek to a specific time.
   * Shaka Player handles segment requests for the target time automatically.
   */
  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
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
    playerInstance = new SabrAudioPlayer({
      onTimeUpdate: (currentTime, _duration) => {
        application.setTrackTime(currentTime);
      },
      onEnded: () => {
        application.endTrack();
      },
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
