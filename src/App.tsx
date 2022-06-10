import { Button } from "@mui/material";
import { FunctionComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { getAuthUrl, REDIRECT_PATH } from "./shared";

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
          setRedirectUri(event.data.origin + REDIRECT_PATH);
          setPluginId(event.data.pluginId);
          break;
      }
    };
    parent.postMessage({ type: "check-login" }, "*");
    window.addEventListener("message", onNewWindowMessage);
    return () => window.removeEventListener("message", onNewWindowMessage);
  }, []);

  const onLogin = () => {
    const url = getAuthUrl(redirectUri, pluginId);
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
      if (newWindow) {
        newWindow.close();
      }
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

  const onSilentRenew = () => {
    parent.postMessage({ type: "silent-renew" }, "*");
  };

  return (
    <>
      {accessToken ? (
        <div>
          <Button variant="contained" onClick={onLogout}>
            Logout
          </Button>
          <Button variant="contained" onClick={onSilentRenew}>
            Silent Renew
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="contained" onClick={onLogin}>
            Login
          </Button>
        </div>
      )}
    </>
  );
};

export default App;
