import { Innertube, Platform, YTNodes } from "youtubei.js";
import type { Types } from "youtubei.js";
import type { SabrFormat } from "googlevideo/shared-types";
import { convertToSabrFormat, type SabrInfo, type SabrClientInfo } from "./sabr-config";

// Client name mapping to numeric values used by googlevideo
const CLIENT_NAME_MAP: Record<string, number> = {
  WEB: 1,
  MWEB: 2,
  ANDROID: 3,
  IOS: 5,
  TVHTML5: 7,
  WEB_REMIX: 67,
  ANDROID_MUSIC: 21,
  WEB_KIDS: 76,
  ANDROID_CREATOR: 14,
  WEB_CREATOR: 62,
  TVHTML5_SIMPLY: 7,
  TVHTML5_SIMPLY_EMBEDDED_PLAYER: 85,
  WEB_EMBEDDED_PLAYER: 56,
};

type PlaylistPanelVideo = YTNodes.PlaylistPanelVideo;
type ReelItem = YTNodes.ReelItem;
type ShortsLockupView = YTNodes.ShortsLockupView;
type WatchCardCompactVideo = YTNodes.WatchCardCompactVideo;
type LockupView = YTNodes.LockupView;

const getDurationSeconds = (duration: any): number => {
  if (!duration) return 0;
  if (typeof duration === "object" && "seconds" in duration) {
    return duration.seconds ?? 0;
  }
  return 0;
};

// Provide a JavaScript evaluator so youtubei.js can decipher streaming URLs.
// Without this, decipher() throws "must provide your own JavaScript evaluator".
Platform.shim.eval = async (
  data: Types.BuildScriptResult,
  env: Record<string, Types.VMPrimative>
) => {
  const properties = [];

  if (env.n) {
    properties.push(`n: exportedVars.nFunction("${env.n}")`);
  }

  if (env.sig) {
    properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  }

  const code = `${data.output}\nreturn { ${properties.join(", ")} }`;

  return new Function(code)();
};

let instance: Innertube | undefined;

const getInnertubeInstance = async (): Promise<Innertube> => {
  if (!instance) {
    instance = await Innertube.create({
      fetch: application.networkRequest,
      cookie: "CONSENT=YES+",
    });
  }
  return instance;
};

export const searchTracksInnertube = async (
  request: SearchRequest
): Promise<SearchTrackResult> => {
  const youtube = await getInnertubeInstance();
  const response = await youtube.search(request.query, {
    type: "video",
  });

  const items = response.videos
    .filter(
      (
        v
      ): v is Exclude<
        typeof v,
        | ReelItem
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ShortsLockupView
      > => "id" in v && "author" in v
    )
    .map(
      (v): Track => ({
        apiId: v.id,
        name: v.title.toString(),
        duration: getDurationSeconds(v.duration),
        images: v.thumbnails.map((t) => ({ url: t.url })),
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: items.length,
    offset: 0,
  };

  return {
    items,
    pageInfo,
  };
};

export const getTrackFromApiIdInnertube = async (
  apiId: string
): Promise<Track> => {
  const youtube = await getInnertubeInstance();
  const info = await youtube.getInfo(apiId);
  const basicInfo = info.basic_info;

  return {
    apiId: apiId,
    name: basicInfo.title ?? "",
    duration: basicInfo.duration ?? 0,
    images: (basicInfo.thumbnail ?? []).map((t) => ({ url: t.url })),
  };
};

export const searchPlaylistsInnertube = async (
  request: SearchRequest
): Promise<SearchPlaylistResult> => {
  const youtube = await getInnertubeInstance();
  const response = await youtube.search(request.query, {
    type: "playlist",
  });

  const items = response.playlists
    .filter((p): p is Exclude<typeof p, LockupView> => "id" in p && "title" in p)
    .map(
      (p): PlaylistInfo => ({
        apiId: p.id,
        name: p.title.toString(),
        images: p.thumbnails.map((t) => ({ url: t.url })),
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: items.length,
    offset: 0,
  };

  return {
    items,
    pageInfo,
  };
};

export const getPlaylistTracksInnertube = async (
  request: PlaylistTrackRequest
): Promise<PlaylistTracksResult> => {
  if (!request.apiId) {
    const pageInfo: PageInfo = {
      resultsPerPage: 0,
      offset: 0,
    };
    return {
      items: [],
      pageInfo,
    };
  }

  const youtube = await getInnertubeInstance();
  const feed = await youtube.getPlaylist(request.apiId);

  const items = feed.items
    .filter(
      (
        v
      ): v is Exclude<
        typeof v,
        | ReelItem
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ShortsLockupView
      > => "id" in v && "author" in v
    )
    .map(
      (v): Track => ({
        apiId: v.id,
        name: v.title.toString(),
        duration: getDurationSeconds(v.duration),
        images: v.thumbnails.map((t) => ({ url: t.url })),
      })
    );

  const pageInfo: PageInfo = {
    resultsPerPage: items.length,
    offset: 0,
  };

  const playlist: PlaylistInfo = {
    name: feed.info.title ?? "",
    apiId: request.apiId,
    images: (feed.info.thumbnails ?? []).map((t) => ({ url: t.url })),
  };

  return {
    items,
    pageInfo,
    playlist,
  };
};

export const getSearchSuggestionsInnertube = async (
  request: GetSearchSuggestionsRequest
): Promise<string[]> => {
  const youtube = await getInnertubeInstance();
  const suggestions = await youtube.getSearchSuggestions(request.query);
  return suggestions.map((s: string | { toString: () => string }) =>
    typeof s === "string" ? s : s.toString()
  );
};

export const getTopItemsInnertube = async (): Promise<SearchAllResult> => {
  const youtube = await getInnertubeInstance();
  const home = await youtube.getHomeFeed();

  const items = home.videos
    .filter(
      (
        v
      ): v is Exclude<
        typeof v,
        | ReelItem
        | PlaylistPanelVideo
        | WatchCardCompactVideo
        | ShortsLockupView
      > => "thumbnails" in v && "author" in v
    )
    .map(
      (v): Track => ({
        apiId: v.id,
        name: v.title.toString(),
        duration: getDurationSeconds(v.duration),
        images: v.thumbnails.map((t) => ({ url: t.url })),
      })
    );

  return {
    tracks: {
      items,
    },
  };
};

/**
 * Get SABR streaming information for a video.
 * This extracts all necessary data for SABR audio streaming.
 *
 * @param apiId - The YouTube video ID
 * @returns SABR streaming information or null if not available
 */
export const getSabrInfoInnertube = async (
  apiId: string
): Promise<SabrInfo | null> => {
  if (!apiId) {
    return null;
  }

  const youtube = await getInnertubeInstance();
  // Use WEB client which should have SABR streaming info
  const info = await youtube.getInfo(apiId, { client: "WEB" });

  const streamingData = info.streaming_data;
  if (!streamingData) {
    console.error("No streamingData found for video:", apiId);
    return null;
  }

  // Extract and decipher SABR streaming URL
  const rawServerAbrStreamingUrl = (streamingData as any).server_abr_streaming_url;
  if (!rawServerAbrStreamingUrl) {
    console.error("No serverAbrStreamingUrl found for video:", apiId);
    return null;
  }
  const serverAbrStreamingUrl = await youtube.session.player!.decipher(
    rawServerAbrStreamingUrl
  );

  // Extract ustreamer config - found in player_config.media_common_config.media_ustreamer_request_config
  const ustreamerConfig =
    (info as any).player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config;
  if (!ustreamerConfig) {
    console.error("No ustreamerConfig found for video:", apiId);
    return null;
  }

  // Get visitor data from session context
  const visitorData =
    youtube.session?.context?.client?.visitorData ??
    (info as any).player_config?.media_common_config?.dynamic_readahead_config
      ?.readahead_config?.video_playback_ustreamer_config?.visitor_data ??
    "";

  // Extract client info from session
  const sessionClient = youtube.session?.context?.client;
  const clientInfo: SabrClientInfo = {
    clientName: CLIENT_NAME_MAP[sessionClient?.clientName ?? "WEB"] ?? 1,
    clientVersion: sessionClient?.clientVersion ?? "2.20250101.00.00",
    osName: sessionClient?.osName ?? "Windows",
    osVersion: sessionClient?.osVersion ?? "10.0",
    deviceMake: sessionClient?.deviceMake ?? "",
    deviceModel: sessionClient?.deviceModel ?? "",
  };

  // Convert adaptive formats to SabrFormat
  const adaptiveFormats = streamingData.adaptive_formats ?? [];
  const formats: SabrFormat[] = adaptiveFormats.map((f) => {
    const format = f as any;
    return convertToSabrFormat({
      itag: format.itag,
      last_modified_ms: format.last_modified_ms,
      lastModified: format.lastModified,
      xtags: format.xtags,
      width: format.width,
      height: format.height,
      mime_type: format.mime_type,
      mimeType: format.mimeType,
      audio_quality: format.audio_quality,
      audioQuality: format.audioQuality,
      bitrate: format.bitrate,
      average_bitrate: format.average_bitrate,
      averageBitrate: format.averageBitrate,
      quality: format.quality,
      quality_label: format.quality_label,
      qualityLabel: format.qualityLabel,
      audio_track: format.audio_track,
      audioTrackId: format.audioTrackId,
      is_drc: format.is_drc,
      isDrc: format.isDrc,
      approx_duration_ms: format.approx_duration_ms,
      approxDurationMs: format.approxDurationMs,
      content_length: format.content_length,
      contentLength: format.contentLength,
      is_auto_dubbed: format.is_auto_dubbed,
      is_descriptive: format.is_descriptive,
      is_dubbed: format.is_dubbed,
      language: format.language,
      is_original: format.is_original,
      is_secondary: format.is_secondary,
    });
  });

  // Get duration in milliseconds
  const durationMs = (info.basic_info?.duration ?? 0) * 1000;

  return {
    serverAbrStreamingUrl,
    ustreamerConfig,
    formats,
    durationMs,
    visitorData,
    clientInfo,
  };
};

/**
 * Get the Innertube instance for external use (e.g., for visitor data access)
 */
export const getInnertube = async (): Promise<Innertube> => {
  return getInnertubeInstance();
};
