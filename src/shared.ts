import axios from "axios";
import en from "./locales/en.json";
import { LocalGasStationRounded } from "@mui/icons-material";

export const CLIENT_ID =
  "125446267595-noltpkn42520oq1sh4h6cnn41f135n1s.apps.googleusercontent.com";
export const TOKEN_SERVER =
  "https://cloudflare-worker-token-service.audio-pwa.workers.dev/token";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const REDIRECT_PATH = "/login_popup.html";

const locales: Record<string, {} | undefined> = {
  en,
};

export const localeStringToLocale = (localeString: string) => {
  const locale = locales[localeString];
  return locale ? locale : en;
};

export const storage: Storage = {
  get length() {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  },
  clear: function (): void {
    try {
      localStorage.clear();
    } catch {}
  },
  getItem: function (key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem: function (key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
  setItem: function (key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  key: function (index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  },
};

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
type UiGetInstanceType = {
  type: "getinstnace";
};
type UiResolveUrls = {
  type: "resolve-urls";
  trackUrls: string;
  playlistId: string;
};

export type UiMessageType =
  | UiCheckLoginType
  | UiLoginType
  | UiLogoutType
  | UiSetKeysType
  | UiGetInstanceType
  | UiResolveUrls;

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
  instance: string;
  locale: string;
  playlists: PlaylistInfo[];
};

type SendInstance = {
  type: "sendinstance";
  instance: string;
};

export type MessageType = LoginType | InfoType | SendInstance;

export const enum StorageType {
  Instances = "instances",
  CurrentInstance = "current-instance",
}

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

export const getYoutubeTrackUrl = (apiId: string): string => {
  return `https://www.youtube.com/watch?v=${apiId}`;
};

export const getYoutubePlaylistUrl = (apiId: string) => {
  return `https://www.youtube.com/playlist?list=${apiId}`;
};
