import axios from "axios";

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
}

interface InvidiousRecommendedVideo {
  videoId: string;
  title: string;
  videoThumbnails: ImageInfo[];
  author: string;
  lengthSeconds: number;
  viewCountText: string;
}

interface InvidiousAdaptiveFormat {
  bitrate: string;
  audioQuality?: string;
  url: string;
  container: string;
  itag: string;
}

const instance = "invidious.namazso.eu";

export async function getYoutubeTrackInvidious(
  track: GetTrackUrlRequest
): Promise<string> {
  const url = `https://${instance}/api/v1/videos/${track.apiId}`;
  const response = await axios.get<InvidiousVideoReponse>(url);
  const sortedArray = response.data.adaptiveFormats
    .filter((a) => !!a.audioQuality)
    .sort((a, b) => parseInt(b.bitrate) - parseInt(a.bitrate));
  const youtubeUrl = sortedArray[0].url;
  return youtubeUrl;
}
