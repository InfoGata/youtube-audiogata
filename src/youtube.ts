import axios from "axios";
import { parse, toSeconds } from "iso8601-duration";
import { TOKEN_URL } from "./shared";

const http = axios.create();

export const setTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem("access_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
  }
};

const refreshToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return;

  const clientId = localStorage.getItem("clientId");
  const clientSecret = localStorage.getItem("clientSecret");
  const tokenUrl = TOKEN_URL;

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  if (clientId && clientSecret) {
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
  }

  const result = await axios.post(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (result.data.access_token) {
    setTokens(result.data.access_token);
    return result.data.access_token as string;
  }
};

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const accessToken = await refreshToken();
      http.defaults.headers.common["Authorization"] = "Bearer " + accessToken;
      return http(originalRequest);
    }
  }
);

export const getApiKey = () => {
  const apiKey = localStorage.getItem("apiKey");
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

const key = "AIzaSyBYUoAxdG5OvUtnxH0HbBioIiF14Ce7RZ0";

export async function getTopItemsYoutube(): Promise<SearchAllResult> {
  const url = "https://www.googleapis.com/youtube/v3/videos";
  const apiKey = getApiKey() || key;
  const urlWithQuery = `${url}?key=${apiKey}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      urlWithQuery
    );
  const trackResults: SearchTrackResult = {
    items: resultToTrackYoutube(detailsResults.data),
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
    await axios.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    );
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = results.data.items?.map((i) => i.id?.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${getApiKey()}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    );
  const trackResults: SearchTrackResult = {
    items: resultToTrackYoutube(detailsResults.data),
    pageInfo: {
      totalResults: results.data.pageInfo?.totalResults || 0,
      resultsPerPage: results.data.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
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
    await axios.get<GoogleAppsScript.YouTube.Schema.SearchListResponse>(
      urlWithQuery
    );
  const playlistResults: SearchPlaylistResult = {
    items: playlistSearchResultToPlaylist(results.data),
    pageInfo: {
      totalResults: results.data.pageInfo?.totalResults || 0,
      resultsPerPage: results.data.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
    },
  };
  return playlistResults;
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
  const instance = request.isUserPlaylist ? http : axios;
  const result =
    await instance.get<GoogleAppsScript.YouTube.Schema.PlaylistItemListResponse>(
      urlWithQuery
    );
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = result.data.items
    ?.map((i) => i.contentDetails?.videoId)
    .join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${getApiKey()}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    );
  const trackResults: SearchTrackResult = {
    items: resultToTrackYoutube(detailsResults.data),
    pageInfo: {
      totalResults: result.data.pageInfo?.totalResults || 0,
      resultsPerPage: result.data.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
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
    );
  const playlistResults: SearchPlaylistResult = {
    items: playlistResultToPlaylist(result.data),
    pageInfo: {
      totalResults: result.data.pageInfo?.totalResults || 0,
      resultsPerPage: result.data.pageInfo?.resultsPerPage || 0,
      offset: request.pageInfo ? request.pageInfo.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
    },
  };
  return playlistResults;
}
