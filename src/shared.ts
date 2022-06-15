import axios from "axios";
export const CLIENT_ID =
  "125446267595-noltpkn42520oq1sh4h6cnn41f135n1s.apps.googleusercontent.com";
export const TOKEN_SERVER =
  "https://audiogata-oauth.audio-pwa.workers.dev/token";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
export const REDIRECT_PATH = "/login_popup.html";

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
}

export const getAuthUrl = (redirectUri: string, pluginId: string) => {
  const state = { pluginId: pluginId };
  const url = new URL(AUTH_URL);
  url.searchParams.append("client_id", CLIENT_ID);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", AUTH_SCOPE);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("state", JSON.stringify(state));
  url.searchParams.append("include_granted_scopes", "true");
  url.searchParams.append("access_type", "offline");
  url.searchParams.append("prompt", "consent");
  return url;
};

export const getToken = async (code: string, redirectUri: string) => {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("grant_type", "authorization_code");

  const result = await axios.post<TokenResponse>(TOKEN_SERVER, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  console.log(result);
  return result.data;
};
