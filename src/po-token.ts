/**
 * Cold start PO tokens for YouTube SABR streaming.
 *
 * A token YouTube accepts for a whole video has to be minted by BotGuard on
 * youtube.com itself, which this plugin's frame is not, so that comes from
 * `application.mintPoToken` (see sabr-player). The cold start token is what
 * playback starts with while that is minted, and what it falls back to when
 * minting is not available: YouTube serves about a minute of most videos with
 * it, and whole videos only for some.
 */

import { BG } from "bgutils-js";

/**
 * Generate a cold start PO token.
 *
 * @param visitorData - The visitor data string from the Innertube session
 * @returns The generated cold start PO token
 */
export const generateColdStartPoToken = (visitorData: string): string => {
  // bgutils-js enforces a 118-byte UTF-8 limit on the identifier.
  // YouTube visitorData can be ~520 chars; truncate to the max allowed.
  const MAX_IDENTIFIER_BYTES = 118;
  const encoder = new TextEncoder();
  let identifier = visitorData;
  // For base64/ASCII visitorData, 1 char = 1 byte, so char truncation works.
  // For safety with multi-byte chars, shrink until it fits.
  while (encoder.encode(identifier).length > MAX_IDENTIFIER_BYTES) {
    identifier = identifier.slice(0, -1);
  }

  return BG.PoToken.generateColdStartToken(identifier, 1);
};
