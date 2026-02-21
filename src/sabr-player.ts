/**
 * SABR Audio Player for YouTube audio streaming.
 * Uses the googlevideo library with MediaSource Extensions for audio playback.
 */

import { SabrStream } from "googlevideo/sabr-stream";
import type { FetchFunction } from "googlevideo/shared-types";
import type { ClientInfo } from "googlevideo/protos";
import { getSabrInfoInnertube } from "./innertube-api";
import { getPoToken } from "./po-token";
import { selectBestAudioFormat, type SabrInfo } from "./sabr-config";

/**
 * Create a wrapped fetch function that adds YouTube-specific headers
 * and properly handles binary data for AudioGata's network request.
 */
const createYouTubeFetch = (): FetchFunction => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);

    // Do NOT set origin/referer to youtube.com — the browser automatically adds
    // sec-fetch-site: none (because AudioGata runs in a sandbox), which contradicts
    // a spoofed origin. Leaving these out keeps headers consistent and avoids 403.

    // Handle binary body data - convert Uint8Array to Blob for proper transmission
    let body: BodyInit | null | undefined = init?.body;
    if (init?.body instanceof Uint8Array) {
      // Slice to get a properly-sized ArrayBuffer (handles subarray views correctly)
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

    // Use the application's network request function
    // SabrStream may pass a URL object; convert to string for networkRequest
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
 * Manages SABR streaming and audio playback using MediaSource Extensions
 */
export class SabrAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private sabrStream: SabrStream | null = null;
  private audioStreamReader: ReadableStreamDefaultReader<Uint8Array> | null =
    null;
  private currentTrack: Track | null = null;
  private state: PlaybackState = PlaybackState.IDLE;
  private callbacks: SabrPlayerCallbacks = {};
  private pendingChunks: Uint8Array[] = [];
  private isAppending: boolean = false;
  private streamEnded: boolean = false;
  private initSegmentReceived: boolean = false;

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
   * Play a track using SABR streaming
   */
  async playTrack(track: Track): Promise<boolean> {
    // Stop any current playback
    this.stop();

    this.currentTrack = track;
    this.setState(PlaybackState.LOADING);

    try {
      const success = await this.initSabrPlayback(track);
      if (!success) {
        throw new Error("SABR streaming not available for this track");
      }
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
   * Initialize SABR playback
   */
  private async initSabrPlayback(track: Track): Promise<boolean> {
    if (!track.apiId) {
      console.error("Track does not have a valid API ID");
      return false;
    }

    // Get SABR info from Innertube
    const sabrInfo = await getSabrInfoInnertube(track.apiId);
    if (!sabrInfo) {
      console.error("Failed to retrieve SABR info for track:", track.apiId);
      return false;
    }

    // Get PO token for SABR streaming
    let poToken: string | undefined;
    try {
      if (sabrInfo.visitorData) {
        console.log("SABR: Getting PO token with visitor data:", sabrInfo.visitorData.substring(0, 20) + "...");
        // Use cold start token which is more reliable in sandboxed environments
        poToken = await getPoToken(sabrInfo.visitorData, true);
        console.log("SABR: Got PO token:", poToken ? poToken.substring(0, 20) + "..." : "null");
      }
    } catch (error) {
      console.warn("SABR: Failed to generate PO token, continuing without it:", error);
    }

    // Use client info from the Innertube session
    const clientInfo: ClientInfo = {
      clientName: sabrInfo.clientInfo.clientName,
      clientVersion: sabrInfo.clientInfo.clientVersion,
      osName: sabrInfo.clientInfo.osName,
      osVersion: sabrInfo.clientInfo.osVersion,
      deviceMake: sabrInfo.clientInfo.deviceMake,
      deviceModel: sabrInfo.clientInfo.deviceModel,
    };

    console.log("SABR: Using client info:", clientInfo);
    console.log("SABR: Streaming URL:", sabrInfo.serverAbrStreamingUrl.substring(0, 100) + "...");
    console.log("SABR: Ustreamer config length:", sabrInfo.ustreamerConfig?.length);
    console.log("SABR: Formats count:", sabrInfo.formats?.length);

    // Create wrapped fetch function with YouTube headers
    const youtubeFetch = createYouTubeFetch();

    // Create SABR stream
    this.sabrStream = new SabrStream({
      fetch: youtubeFetch,
      serverAbrStreamingUrl: sabrInfo.serverAbrStreamingUrl,
      videoPlaybackUstreamerConfig: sabrInfo.ustreamerConfig,
      clientInfo,
      poToken,
      durationMs: sabrInfo.durationMs,
      formats: sabrInfo.formats,
    });

    // Set up audio element and MediaSource
    this.setupAudioElement();
    await this.setupMediaSource(sabrInfo);

    // Start streaming
    const result = await this.sabrStream.start({
      enabledTrackTypes: 1, // Audio only
      preferOpus: true,
    });

    // Start consuming the audio stream
    this.audioStreamReader = result.audioStream.getReader();
    this.consumeAudioStream();

    // Start playback
    await this.audio!.play();
    this.setState(PlaybackState.PLAYING);

    return true;
  }

  /**
   * Set up the audio element
   */
  private setupAudioElement(): void {
    this.audio = document.createElement("audio");
    this.audio.crossOrigin = "anonymous";

    // Time update handler
    this.audio.addEventListener("timeupdate", () => {
      if (this.audio) {
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration || 0;
        this.callbacks.onTimeUpdate?.(currentTime, duration);

        // Report to AudioGata application
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
  }

  /**
   * Set up MediaSource for SABR streaming
   */
  private async setupMediaSource(sabrInfo: SabrInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mediaSource = new MediaSource();
      this.audio!.src = URL.createObjectURL(this.mediaSource);

      this.mediaSource.addEventListener(
        "sourceopen",
        () => {
          try {
            // Select best audio format for MIME type
            const audioFormat = selectBestAudioFormat(sabrInfo.formats);
            const mimeType = audioFormat?.mimeType || "audio/webm; codecs=opus";

            // Check if the MIME type is supported
            if (!MediaSource.isTypeSupported(mimeType)) {
              // Try a fallback MIME type
              const fallbackMime = "audio/webm; codecs=opus";
              if (MediaSource.isTypeSupported(fallbackMime)) {
                this.sourceBuffer =
                  this.mediaSource!.addSourceBuffer(fallbackMime);
              } else {
                throw new Error(`No supported MIME type found`);
              }
            } else {
              this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType);
            }

            // Handle source buffer events
            this.sourceBuffer.addEventListener("updateend", () => {
              this.isAppending = false;
              this.processPendingChunks();
            });

            this.sourceBuffer.addEventListener("error", (e) => {
              console.error("SourceBuffer error:", e);
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        },
        { once: true }
      );

      this.mediaSource.addEventListener(
        "sourceclose",
        () => {
          console.log("MediaSource closed");
        },
        { once: true }
      );

      this.mediaSource.addEventListener(
        "error",
        () => {
          reject(new Error("MediaSource error"));
        },
        { once: true }
      );
    });
  }

  /**
   * Consume the audio stream from SabrStream
   */
  private async consumeAudioStream(): Promise<void> {
    if (!this.audioStreamReader) {
      return;
    }

    try {
      while (true) {
        const { done, value } = await this.audioStreamReader.read();

        if (done) {
          this.streamEnded = true;
          this.finalizeStream();
          break;
        }

        if (value) {
          this.appendChunk(value);
        }
      }
    } catch (error) {
      console.error("Error consuming audio stream:", error);
      // Don't treat stream abort as an error
      if (
        error instanceof Error &&
        error.message.includes("abort") === false
      ) {
        this.callbacks.onError?.(error);
      }
    }
  }

  /**
   * Append a chunk to the source buffer
   */
  private appendChunk(chunk: Uint8Array): void {
    if (!this.sourceBuffer) {
      return;
    }

    this.pendingChunks.push(chunk);
    this.processPendingChunks();
  }

  /**
   * Process pending chunks
   */
  private processPendingChunks(): void {
    if (
      this.isAppending ||
      !this.sourceBuffer ||
      this.pendingChunks.length === 0
    ) {
      return;
    }

    if (this.sourceBuffer.updating) {
      return;
    }

    const chunk = this.pendingChunks.shift();
    if (!chunk) {
      return;
    }

    try {
      this.isAppending = true;
      // Create a new Uint8Array from the chunk to ensure it has a proper ArrayBuffer
      // This is needed because the chunk might have a SharedArrayBuffer which isn't accepted
      const buffer = new Uint8Array(chunk).buffer;
      this.sourceBuffer.appendBuffer(buffer);
      if (!this.initSegmentReceived) {
        this.initSegmentReceived = true;
      }
    } catch (error) {
      this.isAppending = false;
      console.error("Error appending buffer:", error);

      // If QuotaExceededError, try to remove old data
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        this.removeOldBufferedData();
        // Re-add chunk to pending
        this.pendingChunks.unshift(chunk);
      }
    }
  }

  /**
   * Remove old buffered data to make room for new data
   */
  private removeOldBufferedData(): void {
    if (
      !this.sourceBuffer ||
      !this.audio ||
      this.sourceBuffer.updating ||
      this.sourceBuffer.buffered.length === 0
    ) {
      return;
    }

    const currentTime = this.audio.currentTime;
    const removeEnd = Math.max(0, currentTime - 30); // Keep 30 seconds behind

    if (removeEnd > 0) {
      try {
        this.sourceBuffer.remove(0, removeEnd);
      } catch (error) {
        console.error("Error removing buffered data:", error);
      }
    }
  }

  /**
   * Finalize the stream when all data has been received
   */
  private finalizeStream(): void {
    if (!this.mediaSource || this.mediaSource.readyState !== "open") {
      return;
    }

    // Wait for pending chunks to be appended
    if (this.pendingChunks.length > 0 || this.isAppending) {
      setTimeout(() => this.finalizeStream(), 100);
      return;
    }

    try {
      this.mediaSource.endOfStream();
    } catch (error) {
      console.error("Error ending stream:", error);
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
    }
  }

  /**
   * Seek to a specific time
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
   * Stop playback and clean up resources
   */
  stop(): void {
    // Abort SABR stream
    if (this.sabrStream) {
      this.sabrStream.abort();
      this.sabrStream = null;
    }

    // Cancel stream reader
    if (this.audioStreamReader) {
      this.audioStreamReader.cancel().catch(() => {});
      this.audioStreamReader = null;
    }

    // Clean up media source
    if (this.sourceBuffer) {
      try {
        if (this.mediaSource?.readyState === "open") {
          this.sourceBuffer.abort();
        }
      } catch {
        // Ignore errors during cleanup
      }
      this.sourceBuffer = null;
    }

    if (this.mediaSource) {
      if (this.audio?.src) {
        URL.revokeObjectURL(this.audio.src);
      }
      this.mediaSource = null;
    }

    // Clean up audio element
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }

    // Reset state
    this.pendingChunks = [];
    this.isAppending = false;
    this.streamEnded = false;
    this.initSegmentReceived = false;
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
