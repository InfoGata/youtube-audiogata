import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CssBaseline,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "preact/hooks";
import { FunctionComponent, JSX } from "preact";
import {
  getAuthUrl,
  getToken,
  localeStringToLocale,
  MessageType,
  REDIRECT_PATH,
  UiMessageType,
} from "./shared";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { VisibilityOff, Visibility } from "@mui/icons-material";
import en from "./locales/en.json";
import { IntlProvider, Text, translate } from "preact-i18n";

const sendUiMessage = (message: UiMessageType) => {
  parent.postMessage(message, "*");
};

const App: FunctionComponent = () => {
  const [accessToken, setAccessToken] = useState("");
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [playlistId, setPlaylistId] = useState("");
  const [pluginId, setPluginId] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [instance, setInstance] = useState("");
  const [locale, setLocale] = useState<{}>(en);
  const [trackUrls, setTrackUrls] = useState("");

  useEffect(() => {
    const onNewWindowMessage = (event: MessageEvent<MessageType>) => {
      switch (event.data.type) {
        case "login":
          if (event.data.accessToken) {
            setAccessToken(event.data.accessToken);
          }
          break;
        case "info":
          setRedirectUri(event.data.origin + REDIRECT_PATH);
          setPluginId(event.data.pluginId);
          setApiKey(event.data.apiKey);
          setClientId(event.data.clientId);
          setClientSecret(event.data.clientSecret);
          setInstance(event.data.instance);
          setLocale(localeStringToLocale(event.data.locale));
          setPlaylists(event.data.playlists);
          if (event.data.clientId) {
            setShowAdvanced(true);
            setUseOwnKeys(true);
          }
          break;
        case "sendinstance":
          setInstance(event.data.instance);
          break;
        default:
          const _exhaustive: never = event.data;
          break;
      }
    };
    window.addEventListener("message", onNewWindowMessage);
    sendUiMessage({ type: "check-login" });
    return () => window.removeEventListener("message", onNewWindowMessage);
  }, []);

  const onLogin = () => {
    const url = getAuthUrl(redirectUri, pluginId, clientId);
    const newWindow = window.open(url);

    const onMessage = async (returnUrl: string) => {
      const url = new URL(returnUrl);
      const code = url.searchParams.get("code");
      if (code) {
        const response = await getToken(code, redirectUri);
        if (response.access_token) {
          sendUiMessage({
            type: "login",
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
          });
          setAccessToken(response.access_token);
        }
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
    sendUiMessage({ type: "logout" });
  };

  const onSaveKeys = () => {
    setUseOwnKeys(!!clientId);
    sendUiMessage({
      type: "set-keys",
      clientId: clientId,
      clientSecret: clientSecret,
      apiKey: apiKey,
    });
  };

  const onClearKeys = () => {
    setApiKey("");
    setClientId("");
    setClientSecret("");
    setUseOwnKeys(false);
    sendUiMessage({
      type: "set-keys",
      clientId: "",
      clientSecret: "",
      apiKey: "",
    });
  };

  const onAccordionChange = (_: any, expanded: boolean) => {
    setShowAdvanced(expanded);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: JSX.TargetedEvent) => {
    event.preventDefault();
  };

  const getInstance = () => {
    sendUiMessage({ type: "getinstnace" });
  };

  const saveTrackUrl = () => {
    if (playlistId) {
      sendUiMessage({ type: "resolve-urls", trackUrls, playlistId });
    }
  };

  return (
    <IntlProvider definition={locale} scope="common">
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <Stack spacing={2}>
          {accessToken ? (
            <div>
              <Button variant="contained" onClick={onLogout}>
                <Text id="logout">{en.common.logout}</Text>
              </Button>
            </div>
          ) : (
            <div>
              <Accordion expanded={showAdvanced} onChange={onAccordionChange}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1d-content"
                  id="panel1d-header"
                >
                  <Typography>
                    <Text id="advancedConfiguration">
                      {en.common.advancedConfiguration}
                    </Text>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Button
                    variant="contained"
                    onClick={onLogin}
                    disabled={!useOwnKeys}
                  >
                    <Text id="login">{en.common.login}</Text>
                  </Button>
                  <Typography>
                    <Text id="supplyOwnKeys">{en.common.supplyOwnKeys}</Text>:
                  </Typography>
                  <Typography>
                    <Text id="addRedirectUri" fields={{ redirectUri }}>
                      {translate("addRedirectUri", "common", en, {
                        redirectUri,
                      })}
                    </Text>
                  </Typography>
                  <div>
                    <TextField
                      label="Api Key"
                      value={apiKey}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setApiKey(value);
                      }}
                    />
                    <TextField
                      label="Client ID"
                      value={clientId}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setClientId(value);
                      }}
                    />
                    <TextField
                      type={showPassword ? "text" : "password"}
                      label="Client Secret"
                      value={clientSecret}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setClientSecret(value);
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={handleClickShowPassword}
                              onMouseDown={handleMouseDownPassword}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </div>
                  <Stack spacing={2} direction="row">
                    <Button variant="contained" onClick={onSaveKeys}>
                      <Text id="save">{en.common.save}</Text>
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onClearKeys}
                      color="error"
                    >
                      <Text id="clear">{en.common.clear}</Text>
                    </Button>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </div>
          )}
          <Box sx={{ width: "100%" }}>
            <TextField value={instance} fullWidth disabled />
          </Box>
          <Button onClick={getInstance}>
            <Text id="getDifferentInstance">
              {en.common.getDifferentInstance}
            </Text>
          </Button>
          <Typography>
            <Text id="addTracksByUrl">{en.common.addTracksByUrl}</Text>:
          </Typography>
          <TextField
            value={trackUrls}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setTrackUrls(value);
            }}
            multiline
            rows={2}
          />
          <FormControl fullWidth>
            <InputLabel htmlFor="playlist-select">Playlist</InputLabel>
            <Select
              labelId="playlist-select"
              value={playlistId}
              onChange={(e) => {
                const v = e.target && "value" in e.target ? e.target.value : "";
                setPlaylistId(v);
              }}
            >
              {playlists.map((p) => (
                <MenuItem value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={saveTrackUrl}>
            <Text id="save">{en.common.save}</Text>
          </Button>
        </Stack>
      </Box>
    </IntlProvider>
  );
};

export default App;
