import axios from "axios";
import { StorageType } from "./shared";

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

const invdiousSearchVideoToTrack = (result: InvidiousSearchVideo): Track => {
  return {
    name: result.title,
    apiId: result.videoId,
    images: result.videoThumbnails,
    duration: result.lengthSeconds,
  };
};

export const getTrendingInvidious = async (): Promise<Track[]> => {
  const instance = await getCurrentInstance();
  const url = `${instance}/api/v1/trending?type=music`;
  const response = await axios.get<InvidiousSearchVideo[]>(url);
  const tracks = response.data.map(invdiousSearchVideoToTrack);

  return tracks;
};

export const searchTracksInvidious = async (
  request: SearchRequest
): Promise<SearchTrackResult> => {
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/search?q=${request.query}&type=video`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.page?.offset || 0,
  };
  if (request.page?.nextPage) {
    url += `&page=${request.page.nextPage}`;
    const currentPage = parseInt(request.page.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.page?.prevPage) {
    url += `&page=${request.page.prevPage}`;
    const currentPage = parseInt(request.page.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const response = await axios.get<InvidiousSearchVideo[]>(url);
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
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/search?q=${request.query}&type=playlist`;
  let page: PageInfo = {
    resultsPerPage: 20,
    offset: request.page?.offset || 0,
  };
  if (request.page?.nextPage) {
    url += `&page=${request.page.nextPage}`;
    const currentPage = parseInt(request.page.nextPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else if (request.page?.prevPage) {
    url += `&page=${request.page.prevPage}`;
    const currentPage = parseInt(request.page.prevPage);
    page.prevPage = (currentPage - 1).toString();
    page.nextPage = (currentPage + 1).toString();
  } else {
    page.nextPage = "2";
  }
  const response = await axios.get<InvidiousSearchPlaylist[]>(url);

  const playlists = response.data.map(
    (d): PlaylistInfo => ({
      name: d.title,
      apiId: d.playlistId,
      images: d.videos.length > 0 ? d.videos[0].videoThumbnails : [],
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
  const instance = await getCurrentInstance();
  let url = `${instance}/api/v1/playlists/${request.apiId}`;
  const response = await axios.get<InvidiousPlaylist>(url);
  const result = response.data;
  const playlist: PlaylistInfo = {
    name: result.title,
    apiId: result.playlistId,
    images: result.videos.length > 0 ? result.videos[0].videoThumbnails : [],
  };
  const tracks = result.videos.map(
    (v): Track => ({
      name: v.title,
      apiId: v.videoId,
      images: v.videoThumbnails,
      duration: v.lengthSeconds,
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
  const instance = await getCurrentInstance();
  const url = `${instance}/api/v1/videos/${track.apiId}`;
  const response = await axios.get<InvidiousVideoReponse>(url);
  const sortedArray = response.data.adaptiveFormats
    .filter((a) => !!a.audioQuality)
    .sort((a, b) => parseInt(b.bitrate) - parseInt(a.bitrate));
  const youtubeUrl = sortedArray[0].url;
  return youtubeUrl;
}
