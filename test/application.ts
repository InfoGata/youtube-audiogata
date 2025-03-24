import fetch from "node-fetch";

export const application = {
  networkRequest: function (
    input: RequestInfo,
    init?: RequestInit | undefined
  ): Promise<Response> {
    return fetch(input as any, init as any) as any;
  },
  isNetworkRequestCorsDisabled: async function (): Promise<boolean> {
    return true;
  },
  getCorsProxy: async function (): Promise<string | undefined> {
    return "";
  },
  getTheme: async function (): Promise<string> {
    return "light";
  },
};
