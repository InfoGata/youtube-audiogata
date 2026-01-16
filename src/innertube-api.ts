import { Innertube, YTNodes } from "youtubei.js";

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

export const getTrackUrlInnertube = async (
  request: GetTrackUrlRequest
): Promise<string> => {
  if (!request.apiId) {
    return "";
  }
  const youtube = await getInnertubeInstance();
  // Use IOS client to get direct URLs without signature cipher
  const info = await youtube.getInfo(request.apiId, { client: "IOS" });

  const adaptiveFormats = info.streaming_data?.adaptive_formats ?? [];
  const audioFormats = adaptiveFormats.filter(
    (f) => f.mime_type?.startsWith("audio/")
  );

  // Sort by bitrate descending to get best quality
  audioFormats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  const bestAudio = audioFormats[0];
  if (!bestAudio) {
    return "";
  }

  // iOS client provides direct URLs
  if (bestAudio.url) {
    return bestAudio.url;
  }

  // Fallback to deciphering if needed
  if (bestAudio.decipher) {
    return bestAudio.decipher(youtube.session.player);
  }

  return "";
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
