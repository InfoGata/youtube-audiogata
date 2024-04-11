import * as i18n from "@solid-primitives/i18n";
import { createEffect, createMemo, createSignal } from "solid-js";
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

const App = () => {
  const [accessToken, setAccessToken] = createSignal("");
  const [pluginId, setPluginId] = createSignal("");
  const [redirectUri, setRedirectUri] = createSignal("");
  const [useOwnKeys, setUseOwnKeys] = createSignal(false);
  const [apiKey, setApiKey] = createSignal("");
  const [clientId, setClientId] = createSignal("");
  const [clientSecret, setClientSecret] = createSignal("");
  const [instance, setInstance] = createSignal("");
  const [locale, setLocale] = createSignal<Locale>("en");

  const dict = createMemo(() => i18n.flatten(dictionaries[locale()]));

  const t = i18n.translator(dict, i18n.resolveTemplate);

  createEffect(() => {
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
          const locale = isValidLocale(event.data.locale)
            ? event.data.locale
            : "en";
          setLocale(locale);
          if (event.data.clientId) {
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
  });

  const onLogin = () => {
    const url = getAuthUrl(redirectUri(), pluginId(), clientId());
    const newWindow = window.open(url);

    const onMessage = async (returnUrl: string) => {
      const url = new URL(returnUrl);
      const code = url.searchParams.get("code");
      if (code) {
        const response = await getToken(code, redirectUri());
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
      clientId: clientId(),
      clientSecret: clientSecret(),
      apiKey: apiKey(),
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

  const getInstance = () => {
    sendUiMessage({ type: "getinstnace" });
  };

  return (
    <div class="flex">
      <div class="flex flex-col gap-2 w-full">
        {accessToken() ? (
          <div>
            <Button onClick={onLogout}>{t("common.logout")}</Button>
          </div>
        ) : (
          <div>
            <Accordion multiple collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  {t("common.advancedConfiguration")}
                </AccordionTrigger>
                <AccordionContent>
                  <div class="flex flex-col gap-4 m-4">
                    <Button onClick={onLogin} disabled={!useOwnKeys}>
                      {t("common.login")}
                    </Button>
                    <p>{t("common.supplyOwnKeys")}</p>
                    <p>
                      {t("common.addRedirectUri", {
                        redirectUri: redirectUri(),
                      })}
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <Input
                        placeholder="Api Key"
                        value={apiKey()}
                        onChange={(e) => {
                          const value = e.currentTarget.value;
                          setApiKey(value);
                        }}
                      />
                      <Input
                        placeholder="Client ID"
                        value={clientId()}
                        onChange={(e) => {
                          const value = e.currentTarget.value;
                          setClientId(value);
                        }}
                      />
                      <Input
                        type="password"
                        placeholder="Client Secret"
                        value={clientSecret()}
                        onChange={(e) => {
                          const value = e.currentTarget.value;
                          setClientSecret(value);
                        }}
                      />
                    </div>
                    <div class="flex gap-2">
                      <Button onClick={onSaveKeys}>{t("common.save")}</Button>
                      <Button
                        variant="destructive"
                        onClick={onClearKeys}
                        color="error"
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
        <div class="w-full">
          <Input value={instance()} disabled />
        </div>
        <Button onClick={getInstance}>
          {t("common.getDifferentInstance")}
        </Button>
      </div>
    </div>
  );
};

export default App;
