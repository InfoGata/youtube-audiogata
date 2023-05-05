import axios from "axios";
import {
  getYoutubePlaylistUrl,
  getYoutubeTrackUrl,
  StorageType,
} from "./shared";

interface InvidiousVideoReponse {
  title: string;
  videoId: string;
  description: string;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  author: string;
  authorUrl: string;
  lengthSeconds: number;
  hlsUrl: string;
  dashUrl: string;
  recommendedVideos: InvidiousRecommendedVideo[];
  adaptiveFormats: InvidiousAdaptiveFormat[];
  formatStreams: InvidiousFormatStream[];
  videoThumbnails: ImageInfo[];
  published: number;
}

interface InvidiousAdaptiveFormat {
  bitrate: string;
  url: string;
  container: string;
  audioQuality?: string;
}

interface InvidiousFormatStream {
  container: string;
  url: string;
}

interface InvidiousRecommendedVideo {
  videoId: string;
  title: string;
  videoThumbnails: ImageInfo[];
  author: string;
  authorId: string;
  lengthSeconds: number;
  viewCountText: string;
  viewCount: number;
}

interface InvidiousInstance {
  0: string;
  1: InvidiousInstanceData;
}

interface InvidiousInstanceData {
  api: boolean;
  cors: boolean;
  uri: string;
}

interface InvidiousSearchVideo {
  title: string;
  videoId: string;
  videoThumbnails: ImageInfo[];
  lengthSeconds: number;
  viewCount: number;
  author: string;
  authorId: string;
  authorUrl: string;
  published: number;
  description: string;
}

interface InvidiousSearchPlaylist {
  title: string;
  playlistId: string;
  author: string;
  authorId: string;
  videos: InvidiousSearchPlaylistVideo[];
}

interface InvidiousSearchPlaylistVideo {
  title: string;
  videoId: string;
  lengthSeconds: number;
  videoThumbnails: ImageInfo[];
}

export const fetchInstances = async () => {
  const instancesUrl = "https://api.invidious.io/instances.json";
  const response = await axios.get<InvidiousInstance[]>(instancesUrl);
  let instances = response.data;
  instances = instances.filter((instance) =>
    instance[0].includes(".onion") || instance[0].includes(".i2p")
      ? false
      : true
  );
  // Only use instances that uses cors
  instances = instances.filter((instance) => instance[1].cors);
  localStorage.setItem(StorageType.Instances, JSON.stringify(instances));
  return instances;
};

export const getRandomInstance = async (): Promise<string> => {
  const instanceString = localStorage.getItem(StorageType.Instances);
  let instances: InvidiousInstance[] = [];
  if (instanceString) {
    instances = JSON.parse(instanceString);
  } else {
    instances = await fetchInstances();
  }
  const randomIndex = Math.floor(Math.random() * instances.length);
  const newInstance = instances[randomIndex][1].uri;

  localStorage.setItem(StorageType.CurrentInstance, newInstance);
  return newInstance;
};

export const getCurrentInstance = async (): Promise<string> => {
  let instance = localStorage.getItem(StorageType.CurrentInstance);
  if (!instance) {
    instance = await getRandomInstance();
  }
  return instance;
};

const sendRequest = async <T>(path: string) => {
  let instance = await getCurrentInstance();
  try {
    const url = `${instance}${path}`;
    const request = await axios.get<T>(url);
    return request;
  } catch {
    instance = await getRandomInstance();
    const url = `${instance}${path}`;
    const request = await axios.get<T>(url);
    return request;
  }
};

const invdiousSearchVideoToTrack = (result: InvidiousSearchVideo): Track => {
  return {
    name: result.title,
    apiId: result.videoId,
    images: result.videoThumbnails,
    duration: result.lengthSeconds,
    originalUrl: getYoutubeTrackUrl(result.videoId),
  };
};

export const getTrendingInvidious = async (): Promise<Track[]> => {
  const path = `/api/v1/trending?type=music`;
  const response = await sendRequest<InvidiousSearchVideo[]>(path);
  const tracks = response.data.map(invdiousSearchVideoToTrack);

  return tracks;
};

export const searchTracksInvidious = async (
  request: SearchRequest
): Promise<SearchTrackResult> => {
  let path = `/api/v1/search?q=${request.query}&type=video`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.pageInfo?.offset || 0,
  };
  if (request.pageInfo?.nextPage) {
    path += `&page=${request.pageInfo.nextPage}`;
    const currentPage = parseInt(request.pageInfo.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.pageInfo?.prevPage) {
    path += `&page=${request.pageInfo.prevPage}`;
    const currentPage = parseInt(request.pageInfo.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const response = await sendRequest<InvidiousSearchVideo[]>(path);
  const tracks = response.data.map(invdiousSearchVideoToTrack);

  const trackResults: SearchTrackResult = {
    items: tracks,
    pageInfo: page,
  };
  return trackResults;
};

export const searchPlaylistsInvidious = async (
  request: SearchRequest
): Promise<SearchPlaylistResult> => {
  let path = `/api/v1/search?q=${request.query}&type=playlist`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.pageInfo?.offset || 0,
  };
  if (request.pageInfo?.nextPage) {
    path += `&page=${request.pageInfo.nextPage}`;
    const currentPage = parseInt(request.pageInfo.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.pageInfo?.prevPage) {
    path += `&page=${request.pageInfo.prevPage}`;
    const currentPage = parseInt(request.pageInfo.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const response = await sendRequest<InvidiousSearchPlaylist[]>(path);

  const playlists = response.data.map(
    (d): PlaylistInfo => ({
      name: d.title,
      apiId: d.playlistId,
      images: d.videos.length > 0 ? d.videos[0].videoThumbnails : [],
      originalUrl: getYoutubePlaylistUrl(d.playlistId),
    })
  );

  return {
    items: playlists,
    pageInfo: page,
  };
};

interface InvidiousPlaylist {
  title: string;
  playlistId: string;
  author: string;
  authorId: string;
  authorThumbnails: ImageInfo[];
  description: string;
  viewCount: string;
  videos: InvidiousPlaylistVideo[];
}

interface InvidiousPlaylistVideo {
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  lengthSeconds: number;
  videoThumbnails: ImageInfo[];
}

export const getPlaylistTracksInvidious = async (
  request: PlaylistTrackRequest
): Promise<PlaylistTracksResult> => {
  let path = `/api/v1/playlists/${request.apiId}`;
  const response = await sendRequest<InvidiousPlaylist>(path);
  const result = response.data;
  const playlist: PlaylistInfo = {
    name: result.title,
    apiId: result.playlistId,
    images: result.videos.length > 0 ? result.videos[0].videoThumbnails : [],
    originalUrl: getYoutubePlaylistUrl(result.playlistId),
  };
  const tracks = result.videos.map(
    (v): Track => ({
      name: v.title,
      apiId: v.videoId,
      images: v.videoThumbnails,
      duration: v.lengthSeconds,
      originalUrl: getYoutubeTrackUrl(v.videoId),
    })
  );

  return {
    playlist,
    items: tracks,
  };
};

export async function getYoutubeTrackInvidious(
  track: GetTrackUrlRequest
): Promise<string> {
  const path = `/api/v1/videos/${track.apiId}`;
  const response = await sendRequest<InvidiousVideoReponse>(path);
  const sortedArray = response.data.adaptiveFormats
    .filter((a) => !!a.audioQuality)
    .sort((a, b) => parseInt(b.bitrate) - parseInt(a.bitrate));
  const youtubeUrl = sortedArray[0].url;
  return youtubeUrl;
}

export async function getTrackFromApiIdInvidious(
  apiId: string
): Promise<Track> {
  const path = `/api/v1/videos/${apiId}`;
  const response = await sendRequest<InvidiousVideoReponse>(path);
  const data = response.data;
  const track: Track = {
    name: data.title,
    apiId: apiId,
    duration: data.lengthSeconds,
    images: data.videoThumbnails,
    originalUrl: getYoutubeTrackUrl(apiId),
  };
  return track;
}
