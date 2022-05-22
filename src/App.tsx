import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";

const CLIENT_ID =
  "590824233733-0uk932lnqfed56n5hfgndjhlsmdjga3h.apps.googleusercontent.com";
const AUTH_URL = "https://accounts.google.com/o/oauth2/auth";
const AUTH_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const redirectPath = "/login_popup.html";

const App: FunctionComponent = () => {
  const [accessToken, setAccessToken] = useState("");
  const [pluginId, setPluginId] = useState("");
  const [redirectUri, setRedirectUri] = useState("");

  useEffect(() => {
    const onNewWindowMessage = (event: MessageEvent) => {
      switch (event.data.type) {
        case "login":
          if (event.data.accessToken) {
            setAccessToken(event.data.accessToken);
          }
        case "origin":
          setRedirectUri(event.data.origin + redirectPath);
          setPluginId(event.data.pluginId);
          break;
      }
    };
    parent.postMessage({ type: "check-login" }, "*");
    window.addEventListener("message", onNewWindowMessage);
    return () => window.removeEventListener("message", onNewWindowMessage);
  }, []);

  const onLogin = () => {
    const state = { pluginId: pluginId };
    const url = new URL(AUTH_URL);
    url.searchParams.append("client_id", CLIENT_ID);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("scope", AUTH_SCOPE);
    url.searchParams.append("response_type", "token");
    url.searchParams.append("state", JSON.stringify(state));
    console.log(url);
    const newWindow = window.open(url);

    const onMessage = (returnUrl: string) => {
      const url = new URL(returnUrl);
      // params are in hash
      url.search = url.hash.substring(1);
      const accessToken = url.searchParams.get("access_token");
      if (accessToken) {
        parent.postMessage({ type: "login", accessToken: accessToken }, "*");
        setAccessToken(accessToken);
      }
      newWindow.close();
    };

    window.onmessage = (event: MessageEvent) => {
      if (event.source === newWindow) {
        onMessage(event.data.url);
      } else {
        if (event.data.type === "deeplink") {
          onMessage(event.data.url);
        }
      }
    };
  };

  const onLogout = () => {
    setAccessToken("");
    parent.postMessage({ type: "logout" }, "*");
  };

  return (
    <>
      {accessToken ? (
        <div>
          <button onClick={onLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={onLogin}>Login</button>
        </div>
      )}
    </>
  );
};

export default App;
