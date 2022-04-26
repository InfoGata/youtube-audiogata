import axios from "axios";
import { parse, toSeconds } from "iso8601-duration";
import ytdl from "ytdl-core";
import {
  IYoutubeSearchResult,
  IPlaylist,
  IYoutubeResult,
  ISong,
  IYoutubePlaylistItemResult,
  IAlbum,
  IArtist,
  Application,
} from "./types";

declare var application: Application;
const key = "AIzaSyASG5R6Ea6lRT99-GLa2TwbPz5Md7aFL3g";

function playlistResultToPlaylistYoutube(
  result: IYoutubeSearchResult
): IPlaylist[] {
  return result.items.map((r) => ({
    apiId: r.id.playlistId,
    from: "youtube",
    name: r.snippet.title,
    songs: [],
  }));
}

function resultToSongYoutube(result: IYoutubeResult): ISong[] {
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

async function searchTracks(query: string): Promise<ISong[]> {
  return searchYoutube(query);
}

async function getPlaylistTracks(playlist: IPlaylist): Promise<ISong[]> {
  return getYoutubePlaylistTracks(playlist);
}

async function getYoutubePlaylistTracks(playlist: IPlaylist): Promise<ISong[]> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems`;
  const urlWithQuery = `${url}?part=contentDetails&maxResults=50&key=${key}&playlistId=${playlist.apiId}`;
  const result = await axios.get<IYoutubePlaylistItemResult>(urlWithQuery);
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = result.data.items.map((i) => i.contentDetails.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${key}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults = await axios.get<IYoutubeResult>(detailsUrlWithQuery);
  return resultToSongYoutube(detailsResults.data);
}

async function searchPlaylists(query: string): Promise<IPlaylist[]> {
  return searchYoutubePlaylists(query);
}

async function searchYoutubePlaylists(query: string): Promise<IPlaylist[]> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  const urlWithQuery = `${url}?part=snippet&type=playlist&maxResults=50&key=${key}&q=${encodeURIComponent(
    query
  )}`;
  const result = await axios.get<IYoutubeSearchResult>(urlWithQuery);
  return playlistResultToPlaylistYoutube(result.data);
}

async function searchYoutube(query: string): Promise<ISong[]> {
  const url = "https://www.googleapis.com/youtube/v3/search";
  const urlWithQuery = `${url}?part=id&type=video&maxResults=50&key=${key}&q=${encodeURIComponent(
    query
  )}`;
  const results = await axios.get<IYoutubeSearchResult>(urlWithQuery);
  const detailsUrl = "https://www.googleapis.com/youtube/v3/videos";
  const ids = results.data.items.map((i) => i.id.videoId).join(",");
  const detailsUrlWithQuery = `${detailsUrl}?key=${key}&part=snippet,contentDetails&id=${ids}`;
  const detailsResults = await axios.get<IYoutubeResult>(detailsUrlWithQuery);
  return resultToSongYoutube(detailsResults.data);
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

const funcs = {
  name: "youtube",
  async getAlbumTracks(_album: IAlbum) {
    return [];
  },
  async getArtistAlbums(_artist: IArtist) {
    return [];
  },
  async getPlaylistTracks(playlist: IPlaylist) {
    return await getPlaylistTracks(playlist);
  },
  async searchAll(query: string) {
    return {
      albums: [],
      artists: [],
      playlists: await searchPlaylists(query),
      tracks: await searchTracks(query),
    };
  },
  async getTrackUrl(song: ISong): Promise<string> {
    return getYoutubeTrack(song);
  },
};

application.searchAll = funcs.searchAll;
application.getTrackUrl = funcs.getTrackUrl;

window.fetch = function () {
  return application.networkRequest.apply(this, arguments);
};
