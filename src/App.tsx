import { useState, useEffect, useMemo } from "preact/hooks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import en from "./locales/en.json";
import {
  getAuthUrl,
  getToken,
  MessageType,
  REDIRECT_PATH,
  UiMessageType,
} from "./shared";

const sendUiMessage = (message: UiMessageType) => {
  parent.postMessage(message, "*");
};

export type Locale = "en";
type Dict = typeof en;

const dictionaries: Record<Locale, Dict> = {
  en: en,
};

const validLocales = ["en"] as const;
const isValidLocale = (value: unknown): value is Locale =>
  validLocales.includes(value as Locale);

type TranslationKey = string;

const getNestedValue = (obj: any, path: string): string => {
  return path.split(".").reduce((acc, part) => acc?.[part], obj) ?? path;
};

const App = () => {
  const [accessToken, setAccessToken] = useState("");
  const [pluginId, setPluginId] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [locale, setLocale] = useState<Locale>("en");

  const dict = useMemo(() => dictionaries[locale], [locale]);

  const t = (key: TranslationKey, params?: Record<string, string>): string => {
    let value = getNestedValue(dict, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{{${k}}}`, v);
      });
    }
    return value;
  };

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
          const newLocale = isValidLocale(event.data.locale)
            ? event.data.locale
            : "en";
          setLocale(newLocale);
          if (event.data.clientId) {
            setUseOwnKeys(true);
          }
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
        const response = await getToken(
          code,
          redirectUri,
          clientId,
          clientSecret
        );
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

  return (
    <div className="flex">
      <div className="flex flex-col gap-2 w-full">
        {accessToken ? (
          <div>
            <Button onClick={onLogout}>{t("common.logout")}</Button>
          </div>
        ) : (
          <div>
            <Accordion type="multiple">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  {t("common.advancedConfiguration")}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4 m-4">
                    <Button onClick={onLogin} disabled={!useOwnKeys}>
                      {t("common.login")}
                    </Button>
                    <p>{t("common.supplyOwnKeys")}</p>
                    <p>
                      {t("common.addRedirectUri", {
                        redirectUri: redirectUri,
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="Api Key"
                        value={apiKey}
                        onChange={(e: any) => {
                          const value = (e.target as HTMLInputElement).value;
                          setApiKey(value);
                        }}
                      />
                      <Input
                        placeholder="Client ID"
                        value={clientId}
                        onChange={(e: any) => {
                          const value = (e.target as HTMLInputElement).value;
                          setClientId(value);
                        }}
                      />
                      <Input
                        type="password"
                        placeholder="Client Secret"
                        value={clientSecret}
                        onChange={(e: any) => {
                          const value = (e.target as HTMLInputElement).value;
                          setClientSecret(value);
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={onSaveKeys}>{t("common.save")}</Button>
                      <Button
                        variant="destructive"
                        onClick={onClearKeys}
                      >
                        {t("common.clear")}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
