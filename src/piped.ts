import axios from "axios";

interface PipedApiResponse {
  audioStreams: PipedApiAudioStream[];
}

interface PipedApiAudioStream {
  format: string;
  url: string;
  bitrate: number;
}

const instances = [
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.in.projectsegfau.lt",
  "https://watchapi.whatever.social",
  "https://api-piped.mha.fi",
  "https://pipedapi.syncpundit.io",
  "https://pipedapi.moomoo.me",
];

export async function getYoutubeTrackPiped(
  track: GetTrackUrlRequest,
  instanceIndex = 0
): Promise<string> {
  // Will sometimes return 304 with expired url
  // So get a new url each time
  const timestamp = new Date().getTime();
  const instance = instances[instanceIndex];
  try {
    const url = `${instance}/streams/${track.apiId}?timestamp=${timestamp}`;
    const response = await axios.get<PipedApiResponse>(url);
    const sortedArray = response.data.audioStreams.sort(
      (a, b) => b.bitrate - a.bitrate
    );
    const youtubeUrl = sortedArray[0].url;
    return youtubeUrl;
  } catch (err) {
    if (instanceIndex < instances.length) {
      return getYoutubeTrackPiped(track, instanceIndex + 1);
    }
    throw err;
  }
}
