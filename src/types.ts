export interface ISong {
  id?: string;
  name: string;
  source: string;
  from?: string;
  apiId?: string;
  duration?: number;
  albumId?: string;
  artistId?: string;
  artistName?: string;
  images: IImage[];
}

export interface IAlbum {
  name: string;
  apiId: string;
  from: string;
  artistName?: string;
  artistId?: string;
  images: IImage[];
}

export interface IArtist {
  name: string;
  apiId: string;
  from: string;
  images: IImage[];
}

export interface IPlaylist {
  id?: string;
  name: string;
  songs: ISong[];
  apiId?: string;
  images?: IImage[];
  from?: string;
}

export interface IImage {
  url: string;
  height: number;
  width: number;
}

export interface IYoutubeSearchResult {
  items: IYoutubeSearchResultItem[];
}
export interface IYoutubeSearchResultItem {
  id: IYoutubeItemId;
  snippet: IYoutubeItemSnippet;
}
export interface IYoutubeItemId {
  videoId: string;
  playlistId: string;
}
export interface IYoutubeResult {
  items: IYoutubeItem[];
}
export interface IYoutubeItem {
  id: string;
  snippet: IYoutubeItemSnippet;
  contentDetails: IYoutubeContentDetails;
}
export interface IYoutubeItemSnippet {
  title: string;
  thumbnails: IYoutubeThumbnails;
}
export interface IYoutubeThumbnails {
  default: IImage;
  medium: IImage;
  high: IImage;
}
export interface IYoutubeContentDetails {
  duration: string;
}
export interface IYoutubePlaylistItemResult {
  items: IYoutubePlaylistItemItem[];
}
export interface IYoutubePlaylistItemItem {
  contentDetails: IYoutubePlaylistItemDetails;
}
export interface IYoutubePlaylistItemDetails {
  videoId: string;
}

export interface Application {
  searchAll?: (query: string) => Promise<{
    tracks?: ISong[];
    albums?: IAlbum[];
    artists?: IArtist[];
    playlists?: IPlaylist[];
  }>;
  getTrackUrl?: (song: ISong) => Promise<string>;
  getPlaylistTracks?: (playlist: IPlaylist) => Promise<void>;
  postUiMessage: (msg: any) => Promise<void>;
  onUiMessage?: (message: any) => void;
  networkRequest(input: RequestInfo, init?: RequestInit): Promise<Response>;
  isNetworkRequestCorsDisabled: () => Promise<boolean>;
  getCorsProxy: () => Promise<string>;
}
