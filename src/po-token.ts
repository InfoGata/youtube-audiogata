/**
 * PO Token generation using bgutils-js for YouTube SABR streaming.
 * PO (Proof of Origin) tokens are required by YouTube for SABR streaming.
 */

import { BG, type BgConfig } from "bgutils-js";

interface CachedToken {
  token: string;
  visitorData: string;
  expiresAt: number;
}

// Cache TTL: 6 hours in milliseconds
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = "po_token_cache";

/**
 * Get the cached PO token if valid
 */
export const getCachedToken = (): CachedToken | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const token: CachedToken = JSON.parse(cached);
    if (Date.now() >= token.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

/**
 * Cache a PO token
 */
export const cacheToken = (token: string, visitorData: string): void => {
  const cached: CachedToken = {
    token,
    visitorData,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Check if a cached token is still valid for the given visitor data
 */
export const isTokenValid = (visitorData: string): boolean => {
  const cached = getCachedToken();
  return cached !== null && cached.visitorData === visitorData;
};

/**
 * Clear the cached token
 */
export const clearCachedToken = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Generate a cold start PO token.
 * This token works while StreamProtectionStatus is 2, but won't work when it changes to 3.
 * For most use cases, this is sufficient.
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
  if (encoder.encode(identifier).length > MAX_IDENTIFIER_BYTES) {
    // For base64/ASCII visitorData, 1 char = 1 byte, so char truncation works.
    // For safety with multi-byte chars, shrink until it fits.
    while (encoder.encode(identifier).length > MAX_IDENTIFIER_BYTES) {
      identifier = identifier.slice(0, -1);
    }
  }

  const token = BG.PoToken.generateColdStartToken(identifier, 1);
  cacheToken(token, visitorData);
  return token;
};

/**
 * Generate a full PO token using BotGuard challenge execution.
 * This is more complex and requires executing BotGuard scripts in the browser.
 *
 * @param visitorData - The visitor data string from the Innertube session
 * @returns The generated PO token
 */
export const generateFullPoToken = async (
  visitorData: string
): Promise<string> => {
  const requestKey = "O43z0dpjhgX20SCx4KAo";

  const bgConfig: BgConfig = {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      application.networkRequest(input as RequestInfo, init),
    globalObj: globalThis,
    identifier: visitorData,
    requestKey,
  };

  // Fetch the challenge from YouTube
  const challenge = await BG.Challenge.create(bgConfig);

  if (!challenge) {
    throw new Error("Failed to create BotGuard challenge");
  }

  // Create a script element to execute the BotGuard challenge
  const script = document.createElement("script");
  script.id = "bg-script";
  script.textContent =
    challenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;

  // Remove any existing script
  const existingScript = document.getElementById("bg-script");
  if (existingScript) {
    existingScript.remove();
  }

  document.body.appendChild(script);

  // Generate the PO token using the challenge
  const result = await BG.PoToken.generate({
    program: challenge.program,
    globalName: challenge.globalName,
    bgConfig,
  });

  // Cache the token
  cacheToken(result.poToken, visitorData);

  return result.poToken;
};

/**
 * Get a PO token, using cache if available and valid.
 * Falls back to generating a new token if the cache is invalid.
 * Tries full BotGuard token first (more reliable), then falls back to cold start.
 *
 * @param visitorData - The visitor data string from the Innertube session
 * @param preferColdStart - Whether to prefer cold start token (faster but less reliable)
 * @returns The PO token
 */
export const getPoToken = async (
  visitorData: string,
  preferColdStart: boolean = false
): Promise<string> => {
  // Check cache first
  const cached = getCachedToken();
  if (cached && cached.visitorData === visitorData) {
    console.log("PO Token: Using cached token");
    return cached.token;
  }

  // If cold start preferred, use that
  if (preferColdStart) {
    console.log("PO Token: Generating cold start token");
    return generateColdStartPoToken(visitorData);
  }

  // Try full BotGuard token first (more reliable for SABR)
  try {
    console.log("PO Token: Generating full BotGuard token");
    return await generateFullPoToken(visitorData);
  } catch (error) {
    console.warn("PO Token: Full token generation failed, trying cold start:", error);
    return generateColdStartPoToken(visitorData);
  }
};
