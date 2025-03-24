import ky from "ky";
import { parse, toSeconds } from "iso8601-duration";
import { TOKEN_URL, TokenResponse, storage } from "./shared";

const key = "AIzaSyBYUoAxdG5OvUtnxH0HbBioIiF14Ce7RZ0";

export const setTokens = (accessToken: string, refreshToken?: string) => {
  storage.setItem("access_token", accessToken);
  if (refreshToken) {
    storage.setItem("refresh_token", refreshToken);
  }
};

const http = ky.create({
  hooks: {
    beforeRequest: [
      (request) => {
        const token = storage.getItem("access_token");
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          const accessToken = await refreshToken();
          request.headers.set("Authorization", `Bearer ${accessToken}`);
          return http(request, options);
        }
      },
    ],
  },
});

const refreshToken = async () => {
  const refreshToken = storage.getItem("refresh_token");
  if (!refreshToken) return;

  const clientId = storage.getItem("clientId");
  const clientSecret = storage.getItem("clientSecret");
  const tokenUrl = TOKEN_URL;

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  if (clientId && clientSecret) {
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
  }

  const result = await ky.post<TokenResponse>(tokenUrl, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  }).json();

  if (result.access_token) {
    setTokens(result.access_token);
    return result.access_token;
  }
};

export const getApiKey = () => {
  const apiKey = storage.getItem("apiKey");
  return apiKey;
};

function playlistResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.PlaylistListResponse
): PlaylistInfo[] {
  const items = result.items || [];
  return items.map(
    (r): PlaylistInfo => ({
      apiId: r.id,
      name: r.snippet?.title || "",
      images: [
        {
          width: r.snippet?.thumbnails?.default?.width || 0,
          url: r.snippet?.thumbnails?.default?.url || "",
          height: r.snippet?.thumbnails?.default?.height || 0,
        },
      ],
      isUserPlaylist: true,
    })
  );
}

function resultToTrackYoutube(
  result: GoogleAppsScript.YouTube.Schema.VideoListResponse
): Track[] {
  const items = result.items || [];
  return items.map((i) => ({
    apiId: i.id,
    duration: toSeconds(parse(i.contentDetails?.duration || "0")),
    images:
      i.snippet?.thumbnails &&
      Object.values(i.snippet?.thumbnails).map(
        (v: GoogleAppsScript.YouTube.Schema.Thumbnail) => ({
          url: v.url || "",
          height: v.height || 0,
          width: v.width || 0,
        })
      ),
    name: i.snippet?.title || "",
    originalUrl: `https://www.youtube.com/watch?v=${i.id}`,
  }));
}

function playlistSearchResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.SearchListResponse
): PlaylistInfo[] {
  const items = result.items || [];
  return items.map(
    (r): PlaylistInfo => ({
      apiId: r.id?.playlistId,
      name: r.snippet?.title || "",
      images: [
        {
          width: r.snippet?.thumbnails?.default?.width || 0,
          url: r.snippet?.thumbnails?.default?.url || "",
          height: r.snippet?.thumbnails?.default?.height || 0,
        },
      ],
    })
  );
}

export async function getTopItemsYoutube(): Promise<SearchAllResult> {
  const url = "https://www.googleapis.com/youtube/v3/videos";
  const apiKey = getApiKey() || key;
  const urlWithQuery = `${url}?key=${apiKey}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;
  const detailsResults =
    await ky.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      urlWithQuery
    ).json();
  const trackResults: SearchTrackResult = {
    items: resultToTrackYoutube(detailsResults),
  };
  return {
    tracks: trackResults,
  };
}

export async function searchTracksYoutube(
  request: SearchRequest
): Promise<SearchTrackResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=id&type=video&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  if (request.pageInfo) {
    if (request.pageInfo.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.pageInfo.nextPage}`;
    } else if (request.pageInfo.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.pageInfo.prevPage}`;
    }
  }

  const results =
    await ky.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    ).json();
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = results.items?.map((i) => i.id?.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${getApiKey()}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await ky.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    ).json();
  const trackResults: SearchTrackResult = {
    items: resultToTrackYoutube(detailsResults),
    pageInfo: {
      totalResults: results.pageInfo?.totalResults || 0,
      resultsPerPage: results.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: results.nextPageToken,
      prevPage: results.prevPageToken,
    },
  };
  return trackResults;
}

export async function searchPlaylistsYoutube(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=snippet&type=playlist&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  if (request.pageInfo) {
    if (request.pageInfo.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.pageInfo.nextPage}`;
    } else if (request.pageInfo.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.pageInfo.prevPage}`;
    }
  }
  const results =
    await ky.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    ).json();
  const playlistResults: SearchPlaylistResult = {
    items: playlistSearchResultToPlaylist(results),
    pageInfo: {
      totalResults: results.pageInfo?.totalResults || 0,
      resultsPerPage: results.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: results.nextPageToken,
      prevPage: results.prevPageToken,
    },
  };
  return playlistResults;
}

export async function getTracksFromVideosIds(ids: string[]) {
  const idList = ids.join(",");
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const apiKey = getApiKey() || key;
  const detailsUrlWithQuery = `${detailsUrl}?key=${apiKey}&part=snippet,contentDetails&id=${idList}`;
  const detailsResults =
    await ky.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    ).json();
  return resultToTrackYoutube(detailsResults);
}

export async function getPlaylistTracksYoutube(
  request: PlaylistTrackRequest
): Promise<PlaylistTracksResult> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
  let urlWithQuery = `${url}?part=contentDetails&maxResults=50&key=${getApiKey()}&playlistId=${
    request.apiId
  }`;
  if (request.isUserPlaylist) {
    urlWithQuery += "&mine=true";
  }
  if (request.pageInfo) {
    if (request.pageInfo.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.pageInfo.nextPage}`;
    } else if (request.pageInfo.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.pageInfo.prevPage}`;
    }
  }
  const instance = request.isUserPlaylist ? http : ky;
  const result =
    await instance.get<GoogleAppsScript.YouTube.Schema.PlaylistItemListResponse>(
      urlWithQuery
    ).json();
  const ids =
    result.items
      ?.map((i) => i.contentDetails?.videoId)
      .filter((i): i is string => !!i) || [];
  const items = await getTracksFromVideosIds(ids);
  const trackResults: SearchTrackResult = {
    items: items,
    pageInfo: {
      totalResults: result.pageInfo?.totalResults || 0,
      resultsPerPage: result.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: result.nextPageToken,
      prevPage: result.prevPageToken,
    },
  };
  return trackResults;
}

export async function getUserPlaylistsYoutube(
  request: UserPlaylistRequest
): Promise<SearchPlaylistResult> {
  const url = "https://www.googleapis.com/youtube/v3/playlists";
  const urlWithQuery = `${url}?part=snippet,contentDetails&mine=true&key=${getApiKey()}`;
  const result =
    await http.get<GoogleAppsScript.YouTube.Schema.PlaylistListResponse>(
      urlWithQuery
    ).json();
  const playlistResults: SearchPlaylistResult = {
    items: playlistResultToPlaylist(result),
    pageInfo: {
      totalResults: result.pageInfo?.totalResults || 0,
      resultsPerPage: result.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: result.nextPageToken,
      prevPage: result.prevPageToken,
    },
  };
  return playlistResults;
}
