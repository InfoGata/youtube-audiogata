import { Constants, Innertube, Platform, Utils, YT, YTNodes } from "youtubei.js";
import type { Types } from "youtubei.js";
import { buildSabrFormat } from "googlevideo/utils";
import type { SabrInfo, SabrClientInfo } from "./sabr-config";

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
 * Uses actions.execute("/player") + YT.VideoInfo to get a VideoInfo
 * that supports toDash() for generating DASH manifests.
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

  // Use actions.execute to get a player response that supports toDash()
  const playerResponse = await youtube.actions.execute("/player", {
    videoId: apiId,
    contentCheckOk: true,
    racyCheckOk: true,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: youtube.session.player?.signature_timestamp,
      },
    },
  });

  const cpn = Utils.generateRandomString(16);
  const videoInfo = new YT.VideoInfo(
    [playerResponse],
    youtube.actions,
    cpn
  );

  const streamingData = videoInfo.streaming_data;
  if (!streamingData) {
    console.error("No streamingData found for video:", apiId);
    return null;
  }

  // Extract and decipher SABR streaming URL
  const rawServerAbrStreamingUrl = streamingData.server_abr_streaming_url;
  if (!rawServerAbrStreamingUrl) {
    console.error("No serverAbrStreamingUrl found for video:", apiId);
    return null;
  }
  const serverAbrStreamingUrl = await youtube.session.player!.decipher(
    rawServerAbrStreamingUrl
  );

  // Extract ustreamer config
  const ustreamerConfig =
    videoInfo.player_config?.media_common_config
      .media_ustreamer_request_config?.video_playback_ustreamer_config;
  if (!ustreamerConfig) {
    console.error("No ustreamerConfig found for video:", apiId);
    return null;
  }

  // Get visitor data from session context
  const visitorData = youtube.session?.context?.client?.visitorData ?? "";

  // Extract client info from session using Constants.CLIENT_NAME_IDS
  const sessionClient = youtube.session?.context?.client;
  const clientInfo: SabrClientInfo = {
    clientName: parseInt(
      Constants.CLIENT_NAME_IDS[
        sessionClient?.clientName as keyof typeof Constants.CLIENT_NAME_IDS
      ]
    ) || 1,
    clientVersion: sessionClient?.clientVersion ?? "2.20250101.00.00",
    osName: sessionClient?.osName ?? "Windows",
    osVersion: sessionClient?.osVersion ?? "10.0",
    deviceMake: sessionClient?.deviceMake ?? "",
    deviceModel: sessionClient?.deviceModel ?? "",
  };

  // Convert adaptive formats using buildSabrFormat from googlevideo/utils
  const formats = streamingData.adaptive_formats.map(buildSabrFormat);

  // Get duration in milliseconds
  const durationMs = (videoInfo.basic_info?.duration ?? 0) * 1000;

  // Generate DASH manifest for Shaka Player
  const manifest = btoa(
    await videoInfo.toDash({
      manifest_options: {
        is_sabr: true,
        include_thumbnails: false,
      },
    })
  );

  return {
    serverAbrStreamingUrl,
    ustreamerConfig,
    formats,
    durationMs,
    visitorData,
    clientInfo,
    manifest,
  };
};

/**
 * Reload a player response for SABR streaming context updates.
 * Called by SabrStreamingAdapter when the server requests a reload.
 */
export const reloadPlayerResponse = async (
  videoId: string,
  reloadContext: any
): Promise<{ streamingUrl: string; ustreamerConfig?: string }> => {
  const youtube = await getInnertubeInstance();

  const reloadedInfo = await youtube.actions.execute("/player", {
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: youtube.session.player?.signature_timestamp,
      },
      reloadPlaybackContext: reloadContext,
    },
  });

  const cpn = Utils.generateRandomString(16);
  const parsedInfo = new YT.VideoInfo(
    [reloadedInfo],
    youtube.actions,
    cpn
  );

  const streamingUrl = await youtube.session.player!.decipher(
    parsedInfo.streaming_data?.server_abr_streaming_url
  );

  const ustreamerConfig =
    parsedInfo.player_config?.media_common_config
      .media_ustreamer_request_config?.video_playback_ustreamer_config;

  return { streamingUrl, ustreamerConfig };
};

/**
 * Get the Innertube instance for external use (e.g., for visitor data access)
 */
export const getInnertube = async (): Promise<Innertube> => {
  return getInnertubeInstance();
};
