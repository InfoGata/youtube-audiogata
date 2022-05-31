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

export interface IPlaylist extends PlaylistInfo {
  songs: ISong[];
  apiId?: string;
  from?: string;
}

export interface PlaylistInfo {
  id?: string;
  images?: IImage[];
  name?: string;
  isUserPlaylist?: boolean;
}

export interface IImage {
  url: string;
  height: number;
  width: number;
}

export interface Application {
  searchAll?: (request: SearchRequest) => Promise<SearchAllResult>;
  searchTracks?: (request: SearchRequest) => Promise<SearchTrackResult>;
  searchArtists?: (request: SearchRequest) => Promise<SearchArtistResult>;
  searchAlbums?: (request: SearchRequest) => Promise<SearchAlbumResult>;
  searchPlaylists?: (request: SearchRequest) => Promise<SearchPlaylistResult>;
  getTrackUrl?: (song: ISong) => Promise<string>;
  getPlaylistTracks?: (
    request: PlaylistTrackRequest
  ) => Promise<SearchTrackResult>;
  postUiMessage: (msg: any) => Promise<void>;
  onDeepLinkMessage: (message: string) => Promise<void>;
  onUiMessage?: (message: any) => void;
  networkRequest(input: RequestInfo, init?: RequestInit): Promise<Response>;
  isNetworkRequestCorsDisabled: () => Promise<boolean>;
  getCorsProxy: () => Promise<string>;
  getPluginId: () => Promise<string>;
  getUserPlaylists?: (
    request: UserPlaylistRequest
  ) => Promise<SearchPlaylistResult>;
}

export interface PageInfo {
  totalResults: number;
  resultsPerPage: number;
  offset: number;
  nextPage?: string;
  prevPage?: string;
}

export interface SearchAllResult {
  tracks?: SearchTrackResult;
  albums?: SearchAlbumResult;
  artists?: SearchArtistResult;
  playlists?: SearchPlaylistResult;
}

export interface SearchTrackResult {
  items: ISong[];
  pageInfo?: PageInfo;
}

export interface SearchArtistResult {
  items: IArtist[];
  pageInfo?: PageInfo;
}

export interface SearchAlbumResult {
  items: IAlbum[];
  pageInfo?: PageInfo;
}

export interface SearchPlaylistResult {
  items: IPlaylist[];
  pageInfo?: PageInfo;
}

export interface SearchRequest {
  query: string;
  page?: PageInfo;
}

export interface PlaylistTrackRequest {
  playlist: IPlaylist;
  page?: PageInfo;
}

export interface UserPlaylistRequest {
  page?: PageInfo;
}
