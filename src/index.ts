import { MessageType, UiMessageType } from "./shared";
import { getYoutubeTrackPiped } from "./piped";
import {
  fetchInstances,
  getCurrentInstance,
  getPlaylistTracksInvidious,
  getRandomInstance,
  getTrackFromApiIdInvidious,
  searchPlaylistsInvidious,
  searchTracksInvidious,
} from "./invidious";
import {
  getPlaylistTracksYoutube,
  getTopItemsYoutube,
  getUserPlaylistsYoutube,
  setTokens,
  getTracksFromVideosIds,
} from "./youtube";

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
  const locale = await application.getLocale();
  const playlists = await application.getPlaylistsInfo();
  const apiKey = localStorage.getItem("apiKey") ?? "";
  const clientId = localStorage.getItem("clientId") ?? "";
  const clientSecret = localStorage.getItem("clientSecret") ?? "";
  const instance = await getCurrentInstance();
  sendMessage({
    type: "info",
    origin: origin,
    pluginId: pluginId,
    apiKey,
    clientId,
    clientSecret,
    instance,
    locale,
    playlists,
  });
};

const importPlaylist = async (url: string): Promise<Playlist> => {
  const youtubeUrl = new URL(url);
  const listId = youtubeUrl.searchParams.get("list");
  if (listId) {
    const playlistResponse = await getPlaylistTracks({
      apiId: listId,
      isUserPlaylist: false,
    });

    const playlist: Playlist = {
      ...playlistResponse.playlist,
      tracks: playlistResponse.items,
    };

    return playlist;
  }
  throw new Error("Couldn't retreive playlist");
};

const resolveTracksUrls = async (urlStrings: string[]) => {
  const ids: string[] = [];
  urlStrings.forEach((u) => {
    try {
      const url = new URL(u);
      const videoId = url.searchParams.get("v");
      if (videoId) {
        ids.push(videoId);
      }
    } catch {}
  });

  // Max number of ids that youtube api allows is 50
  const length = ids.length;
  const limit = 50;
  let start = 0;
  let end = limit;
  const results: Track[] = [];
  while (start < length) {
    const idSlice = ids.slice(start, end);
    const tracks = await getTracksFromVideosIds(idSlice);
    results.push(...tracks);
    start += limit;
    end += limit;
  }

  return results;
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
      application.onGetUserPlaylists = getUserPlaylistsYoutube;
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
      application.createNotification({ message: "Api Keys saved!" });
      break;
    case "getinstnace":
      const instance = await getRandomInstance();
      sendMessage({ type: "sendinstance", instance });
      break;
    case "resolve-urls":
      const tracks = await resolveTracksUrls(message.trackUrls.split("\n"));
      await application.addTracksToPlaylist(message.playlistId, tracks);
      application.createNotification({ message: "Success!" });
      break;
    default:
      const _exhaustive: never = message;
      break;
  }
};

async function searchTracks(
  request: SearchRequest
): Promise<SearchTrackResult> {
  return searchTracksInvidious(request);
}

async function getTrack(request: GetTrackRequest): Promise<Track> {
  return getTrackFromApiIdInvidious(request.apiId);
}

async function searchPlaylists(
  request: SearchRequest
): Promise<SearchPlaylistResult> {
  return searchPlaylistsInvidious(request);
}

async function getPlaylistTracks(
  request: PlaylistTrackRequest
): Promise<PlaylistTracksResult> {
  if (request.isUserPlaylist) {
    return getPlaylistTracksYoutube(request);
  }
  return getPlaylistTracksInvidious(request);
}

async function getTopItems(): Promise<SearchAllResult> {
  const result = await getTopItemsYoutube();
  return result;
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

async function getTrackUrl(track: GetTrackUrlRequest): Promise<string> {
  return await getYoutubeTrackPiped(track);
}

export async function canParseUrl(
  url: string,
  type: ParseUrlType
): Promise<boolean> {
  const playlistRegex = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
  const videoRegex =
    /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]+)(?:\S+)?$/;
  if (!playlistRegex.test(url) && !videoRegex.test(url)) {
    return false;
  }

  switch (type) {
    case "playlist":
      return new URL(url).searchParams.has("list");
    case "track":
      return true;
    default:
      return false;
  }
}

application.onSearchAll = searchAll;
application.onSearchTracks = searchTracks;
application.onSearchPlaylists = searchPlaylists;
application.onGetTrackUrl = getTrackUrl;
application.onGetPlaylistTracks = getPlaylistTracks;
application.onGetTopItems = getTopItems;
application.onGetTrack = getTrack;
application.onLookupPlaylistUrl = importPlaylist;
application.onLookupTrackUrls = resolveTracksUrls;
application.onCanParseUrl = canParseUrl;

application.onLookupTrack = async (request: LookupTrackRequest) => {
  const search = await searchTracks({
    query: `${request.artistName} - ${request.trackName}`,
  });
  return search.items[0];
};

application.onDeepLinkMessage = async (message: string) => {
  application.postUiMessage({ type: "deeplink", url: message });
};

const init = async () => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylistsYoutube;
  }
  await fetchInstances();
};

init();
