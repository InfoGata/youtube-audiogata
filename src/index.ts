import axios from "axios";
import { parse, toSeconds } from "iso8601-duration";
import {
  CLIENT_ID,
  MessageType,
  TOKEN_SERVER,
  TOKEN_URL,
  UiMessageType,
} from "./shared";
import "audiogata-plugin-typings";
//import { getYoutubeTrackPiped } from "./piped";
import { getYoutubeTrackInvidious } from "./invidious";
const http = axios.create();

const key = "AIzaSyB3nKWm5VUqMMAaFhC3QCH_0VJU84Oyq48";

const getApiKey = () => {
  const apiKey = localStorage.getItem("apiKey");
  return apiKey || key;
};

const setTokens = (accessToken: string, refreshToken?: string) => {
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
  let tokenUrl = TOKEN_SERVER;

  const params = new URLSearchParams();
  params.append("client_id", clientId || CLIENT_ID);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  if (clientId && clientSecret) {
    params.append("client_secret", clientSecret);
    tokenUrl = TOKEN_URL;
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

const sendMessage = (message: MessageType) => {
  application.postUiMessage(message);
};

const sendInfo = async () => {
  const host = document.location.host;
  const hostArray = host.split(".");
  hostArray.shift();
  const domain = hostArray.join(".");
  const origin = `${document.location.protocol}//${domain}`;
  const pluginId = await application.getPluginId();
  const apiKey = localStorage.getItem("apiKey") ?? "";
  const clientId = localStorage.getItem("clientId") ?? "";
  const clientSecret = localStorage.getItem("clientSecret") ?? "";
  sendMessage({
    type: "info",
    origin: origin,
    pluginId: pluginId,
    apiKey,
    clientId,
    clientSecret,
  });
};

application.onUiMessage = async (message: UiMessageType) => {
  switch (message.type) {
    case "check-login":
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        sendMessage({ type: "login", accessToken: accessToken });
      }
      await sendInfo();
      break;
    case "login":
      setTokens(message.accessToken, message.refreshToken);
      application.onGetUserPlaylists = getUserPlaylists;
      break;
    case "logout":
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      application.onGetUserPlaylists = undefined;
      break;
    case "set-keys":
      localStorage.setItem("apiKey", message.apiKey);
      localStorage.setItem("clientId", message.clientId);
      localStorage.setItem("clientSecret", message.clientSecret);
      application.createNotification({ message: "Api keys Saved!" });
      break;
  }
};

function playlistResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.PlaylistListResponse
): PlaylistInfo[] {
  const items = result.items || [];
  return items.map((r) => ({
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
  }));
}

function playlistSearchResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.SearchListResponse
): PlaylistInfo[] {
  const items = result.items || [];
  return items.map((r) => ({
    apiId: r.id?.playlistId,
    name: r.snippet?.title || "",
    images: [
      {
        width: r.snippet?.thumbnails?.default?.width || 0,
        url: r.snippet?.thumbnails?.default?.url || "",
        height: r.snippet?.thumbnails?.default?.height || 0,
      },
    ],
  }));
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

async function getUserPlaylists(
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
      offset: request.page ? request.page.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
    },
  };
  return playlistResults;
}

async function searchTracks(
  request: SearchRequest
): Promise<SearchTrackResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=id&type=video&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  if (request.page) {
    if (request.page.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.page.nextPage}`;
    } else if (request.page.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.page.prevPage}`;
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
      offset: request.page ? request.page.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
    },
  };
  return trackResults;
}

async function searchPlaylists(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  let urlWithQuery = `${url}?part=snippet&type=playlist&maxResults=50&key=${getApiKey()}&q=${encodeURIComponent(
    request.query
  )}`;
  if (request.page) {
    if (request.page.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.page.nextPage}`;
    } else if (request.page.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.page.prevPage}`;
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
      offset: request.page ? request.page.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
    },
  };
  return playlistResults;
}

async function getPlaylistTracks(
  request: PlaylistTrackRequest
): Promise<PlaylistTracksResult> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
  let urlWithQuery = `${url}?part=contentDetails&maxResults=50&key=${getApiKey()}&playlistId=${
    request.apiId
  }`;
  if (request.isUserPlaylist) {
    urlWithQuery += "&mine=true";
  }
  if (request.page) {
    if (request.page.nextPage) {
      // Next Page
      urlWithQuery += `&pageToken=${request.page.nextPage}`;
    } else if (request.page.prevPage) {
      // Prev P1ge
      urlWithQuery += `&pageToken=${request.page.prevPage}`;
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
  const trackResults: PlaylistTracksResult = {
    items: resultToTrackYoutube(detailsResults.data),
    pageInfo: {
      totalResults: result.data.pageInfo?.totalResults || 0,
      resultsPerPage: result.data.pageInfo?.resultsPerPage || 0,
      offset: request.page ? request.page.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
    },
  };
  return trackResults;
}

async function getYoutubeTrack(track: GetTrackUrlRequest): Promise<string> {
  return getYoutubeTrackInvidious(track);
}

async function searchAll(request: SearchRequest): Promise<SearchAllResult> {
  const tracksPromise = searchTracks(request);
  const playlistsPromise = searchPlaylists(request);
  const [tracks, playlists] = await Promise.all([
    tracksPromise,
    playlistsPromise,
  ]);
  return {
    tracks,
    playlists,
  };
}

async function getTopItems(): Promise<SearchAllResult> {
  const url = "https://www.googleapis.com/youtube/v3/videos";
  const urlWithQuery = `${url}?key=${getApiKey()}&videoCategoryId=10&chart=mostPopular&part=snippet,contentDetails`;
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

async function getTrackUrl(track: GetTrackUrlRequest): Promise<string> {
  return getYoutubeTrack(track);
}

application.onSearchAll = searchAll;
application.onSearchTracks = searchTracks;
application.onSearchPlaylists = searchPlaylists;
application.onGetTrackUrl = getTrackUrl;
application.onGetPlaylistTracks = getPlaylistTracks;
application.onGetTopItems = getTopItems;

application.onDeepLinkMessage = async (message: string) => {
  application.postUiMessage({ type: "deeplink", url: message });
};

window.fetch = function () {
  return application.networkRequest.apply(this, arguments as any);
};

const init = () => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylists;
  }
};

init();
