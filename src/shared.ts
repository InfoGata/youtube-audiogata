import axios from "axios";
export const CLIENT_ID =
  "125446267595-noltpkn42520oq1sh4h6cnn41f135n1s.apps.googleusercontent.com";
export const TOKEN_SERVER =
  "https://cloudflare-worker-token-service.audio-pwa.workers.dev/token";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const REDIRECT_PATH = "/login_popup.html";

type UiCheckLoginType = {
  type: "check-login";
};
type UiLoginType = {
  type: "login";
  accessToken: string;
  refreshToken: string;
};
type UiLogoutType = {
  type: "logout";
};
type UiSetKeysType = {
  type: "set-keys";
  apiKey: string;
  clientId: string;
  clientSecret: string;
};

export type UiMessageType =
  | UiCheckLoginType
  | UiLoginType
  | UiLogoutType
  | UiSetKeysType;

type LoginType = {
  type: "login";
  accessToken: string;
};

type InfoType = {
  type: "info";
  origin: string;
  pluginId: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
};

export type MessageType = LoginType | InfoType;

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
}

export const getAuthUrl = (
  redirectUri: string,
  pluginId: string,
  clientId?: string
) => {
  const state = { pluginId: pluginId };
  const url = new URL(AUTH_URL);
  url.searchParams.append("client_id", clientId || CLIENT_ID);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", AUTH_SCOPE);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("state", JSON.stringify(state));
  url.searchParams.append("include_granted_scopes", "true");
  url.searchParams.append("access_type", "offline");
  url.searchParams.append("prompt", "consent");
  return url;
};

export const getToken = async (
  code: string,
  redirectUri: string,
  clientId?: string,
  clientSecret?: string
) => {
  let tokenUrl = TOKEN_SERVER;
  const params = new URLSearchParams();
  params.append("client_id", clientId || CLIENT_ID);
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("grant_type", "authorization_code");

  if (clientId && clientSecret) {
    params.append("client_secret", clientSecret);
    tokenUrl = TOKEN_URL;
  }
  const result = await axios.post<TokenResponse>(tokenUrl, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return result.data;
};
