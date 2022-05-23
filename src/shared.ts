const CLIENT_ID =
  "125446267595-noltpkn42520oq1sh4h6cnn41f135n1s.apps.googleusercontent.com";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";

export const REDIRECT_PATH = "/login_popup.html";
export const getAuthUrl = (redirectUri: string, pluginId: string) => {
  const state = { pluginId: pluginId };
  const url = new URL(AUTH_URL);
  url.searchParams.append("client_id", CLIENT_ID);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", AUTH_SCOPE);
  url.searchParams.append("response_type", "token");
  url.searchParams.append("state", JSON.stringify(state));
  return url;
};
