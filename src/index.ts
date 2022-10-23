import { MessageType, UiMessageType } from "./shared";
//import { getYoutubeTrackPiped } from "./piped";
import {
  fetchInstances,
  getCurrentInstance,
  getPlaylistTracksInvidious,
  getRandomInstance,
  getYoutubeTrackInvidious,
  searchPlaylistsInvidious,
  searchTracksInvidious,
} from "./invidious";
import {
  getPlaylistTracksYoutube,
  getTopItemsYoutube,
  getUserPlaylistsYoutube,
  setTokens,
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
      application.createNotification({ message: "Api keys Saved!" });
      break;
    case "getinstnace":
      const instance = await getRandomInstance();
      sendMessage({ type: "sendinstance", instance });
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
  return getYoutubeTrackInvidious(track);
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

const init = async () => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    application.onGetUserPlaylists = getUserPlaylistsYoutube;
  }
  await fetchInstances();
};

init();
