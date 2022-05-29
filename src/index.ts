import axios, { AxiosRequestConfig } from "axios";
import { parse, toSeconds } from "iso8601-duration";
import ytdl from "ytdl-core";
import { getAuthUrl, REDIRECT_PATH } from "./shared";
import {
  IPlaylist,
  ISong,
  Application,
  SearchRequest,
  SearchAllResult,
  SearchTrackResult,
  SearchPlaylistResult,
  PlaylistTrackRequest,
  UserPlaylistRequest,
} from "./types";
declare var application: Application;

const key = "AIzaSyB3nKWm5VUqMMAaFhC3QCH_0VJU84Oyq48";
let pluginId = "";
let accessToken = "";
let redirectUri = "";

const getRequestConfig = () => {
  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  return config;
};

const silentRefresh = () => {
  const url = getAuthUrl(redirectUri, pluginId);
  url.searchParams.append("prompt", "none");

  const iframe = document.createElement("iframe");
  iframe.title = "silent-renew";
  iframe.src = url.href;
  const refreshMessanger = (event: MessageEvent) => {
    if (event.source === iframe.contentWindow) {
      if (event.data.url) {
        const tokenUrl = new URL(event.data.url);
        tokenUrl.search = tokenUrl.hash.substring(1);
        accessToken = tokenUrl.searchParams.get("access_token");
        if (accessToken) {
          localStorage.setItem("access_token", accessToken);
        }
      }
      window.removeEventListener("message", refreshMessanger);
      iframe.remove();
    }
  };
  window.addEventListener("message", refreshMessanger);
  document.body.append(iframe);
};

const sendOrigin = async () => {
  const host = document.location.host;
  const hostArray = host.split(".");
  hostArray.shift();
  const domain = hostArray.join(".");
  const origin = `${document.location.protocol}//${domain}`;
  redirectUri = `${origin}${REDIRECT_PATH}`;
  pluginId = await application.getPluginId();
  application.postUiMessage({
    type: "origin",
    origin: origin,
    pluginId: pluginId,
  });
};

application.onUiMessage = async (message: any) => {
  switch (message.type) {
    case "check-login":
      accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        application.postUiMessage({ type: "login", accessToken: accessToken });
      }
      await sendOrigin();
      break;
    case "login":
      accessToken = message.accessToken;
      localStorage.setItem("access_token", accessToken);
      application.getUserPlaylists = getUserPlaylists;
      break;
    case "logout":
      localStorage.removeItem("access_token");
      accessToken = null;
      application.getUserPlaylists = undefined;
      break;
    case "silent-renew":
      silentRefresh();
      break;
  }
};

function playlistResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.PlaylistListResponse
): IPlaylist[] {
  return result.items.map((r) => ({
    apiId: r.id,
    name: r.snippet.title,
    images: [
      {
        width: r.snippet.thumbnails.default.width,
        url: r.snippet.thumbnails.default.url,
        height: r.snippet.thumbnails.default.height,
      },
    ],
    isUserPlaylist: true,
    songs: [],
  }));
}

function playlistSearchResultToPlaylist(
  result: GoogleAppsScript.YouTube.Schema.SearchListResponse
): IPlaylist[] {
  return result.items.map((r) => ({
    apiId: r.id.playlistId,
    from: "youtube",
    name: r.snippet.title,
    images: [
      {
        width: r.snippet.thumbnails.default.width,
        url: r.snippet.thumbnails.default.url,
        height: r.snippet.thumbnails.default.height,
      },
    ],
    songs: [],
  }));
}

function resultToSongYoutube(
  result: GoogleAppsScript.YouTube.Schema.VideoListResponse
): ISong[] {
  const items = result.items;
  return items.map(
    (i) =>
      ({
        apiId: i.id,
        duration: toSeconds(parse(i.contentDetails.duration)),
        from: "youtube",
        images: [
          i.snippet.thumbnails.default,
          i.snippet.thumbnails.medium,
          i.snippet.thumbnails.high,
        ],
        name: i.snippet.title,
      } as ISong)
  );
}

async function getUserPlaylists(
  request: UserPlaylistRequest
): Promise<SearchPlaylistResult> {
  const url = "https://www.googleapis.com/youtube/v3/playlists";
  const urlWithQuery = `${url}?part=snippet,contentDetails&mine=true&key=${key}`;
  const result =
    await axios.get<GoogleAppsScript.YouTube.Schema.PlaylistListResponse>(
      urlWithQuery,
      getRequestConfig()
    );
  const playlists = playlistResultToPlaylist(result.data);
  const playlistResults: SearchPlaylistResult = {
    items: playlistResultToPlaylist(result.data),
    pageInfo: {
      totalResults: result.data.pageInfo.totalResults,
      resultsPerPage: result.data.pageInfo.resultsPerPage,
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
  let urlWithQuery = `${url}?part=id&type=video&maxResults=50&key=${key}&q=${encodeURIComponent(
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
  const ids = results.data.items.map((i) => i.id.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${key}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    );
  const trackResults: SearchTrackResult = {
    items: resultToSongYoutube(detailsResults.data),
    pageInfo: {
      totalResults: results.data.pageInfo.totalResults,
      resultsPerPage: results.data.pageInfo.resultsPerPage,
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
  let urlWithQuery = `${url}?part=snippet&type=playlist&maxResults=50&key=${key}&q=${encodeURIComponent(
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
      totalResults: results.data.pageInfo.totalResults,
      resultsPerPage: results.data.pageInfo.resultsPerPage,
      offset: request.page ? request.page.offset : 0,
      nextPage: results.data.nextPageToken,
      prevPage: results.data.prevPageToken,
    },
  };
  return playlistResults;
}

async function getPlaylistTracks(
  request: PlaylistTrackRequest
): Promise<SearchTrackResult> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
  let urlWithQuery = `${url}?part=contentDetails&maxResults=50&key=${key}&playlistId=${request.playlist.apiId}`;
  if (request.playlist.isUserPlaylist) {
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
  const config = request.playlist.isUserPlaylist
    ? getRequestConfig()
    : undefined;
  const result =
    await axios.get<GoogleAppsScript.YouTube.Schema.PlaylistItemListResponse>(
      urlWithQuery,
      config
    );
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = result.data.items.map((i) => i.contentDetails.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${key}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults =
    await axios.get<GoogleAppsScript.YouTube.Schema.VideoListResponse>(
      detailsUrlWithQuery
    );
  const trackResults: SearchTrackResult = {
    items: resultToSongYoutube(detailsResults.data),
    pageInfo: {
      totalResults: result.data.pageInfo.totalResults,
      resultsPerPage: result.data.pageInfo.resultsPerPage,
      offset: request.page ? request.page.offset : 0,
      nextPage: result.data.nextPageToken,
      prevPage: result.data.prevPageToken,
    },
  };
  return trackResults;
}

async function getYoutubeTrack(song: ISong): Promise<string> {
  const corsDisabled = await application.isNetworkRequestCorsDisabled();
  let info: ytdl.videoInfo;

  if (corsDisabled) {
    info = await ytdl.getInfo(song.apiId || "");
  } else {
    const proxy = await application.getCorsProxy();
    if (proxy) {
      const url = new URL(proxy);
      info = await ytdl.getInfo(song.apiId || "", {
        requestOptions: {
          transform: (parsed: any) => {
            parsed.protocol = url.protocol;
            return {
              headers: { Host: parsed.host },
              host: url.hostname,
              path: "/http://youtube.com" + parsed.path,
              maxRedirects: 10,
              port: url.port,
              protocol: url.protocol,
            };
          },
        },
      });
    } else {
      // Try anyway
      info = await ytdl.getInfo(song.apiId || "");
    }
  }

  const formatInfo = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
  });
  return formatInfo.url;
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

async function getTrackUrl(song: ISong): Promise<string> {
  return getYoutubeTrack(song);
}

application.searchAll = searchAll;
application.searchTracks = searchTracks;
application.searchPlaylists = searchPlaylists;
application.getTrackUrl = getTrackUrl;
application.getPlaylistTracks = getPlaylistTracks;

application.onDeepLinkMessage = async (message: string) => {
  application.postUiMessage({ type: "deeplink", url: message });
};

window.fetch = function () {
  return application.networkRequest.apply(this, arguments);
};

const init = () => {
  accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    application.getUserPlaylists = getUserPlaylists;
  }
};

init();
