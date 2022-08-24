import axios from "axios";

interface PipedApiResponse {
  audioStreams: PipedApiAudioStream[];
}

interface PipedApiAudioStream {
  format: string;
  url: string;
  bitrate: number;
}

export async function getYoutubeTrackPiped(
  track: GetTrackUrlRequest
): Promise<string> {
  // Will sometimes return 304 with expired url
  // So get a new url each time
  const timestamp = new Date().getTime();
  const url = `https://pipedapi.kavin.rocks/streams/${track.apiId}?timestamp=${timestamp}`;
  const response = await axios.get<PipedApiResponse>(url);
  const sortedArray = response.data.audioStreams.sort(
    (a, b) => b.bitrate - a.bitrate
  );
  const youtubeUrl = sortedArray[0].url;
  return youtubeUrl;
}
