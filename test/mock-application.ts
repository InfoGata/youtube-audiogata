export const mockApplication = {
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
  postUiMessage: function(message: any) {},
  getPluginId: async function() { return "test-plugin"; },
  getLocale: async function() { return "en"; },
  getPlaylistsInfo: async function() { return []; },
  onUiMessage: undefined as any,
  onGetUserPlaylists: undefined as any,
  createNotification: function(notification: any) {},
  addTracksToPlaylist: async function(playlistId: string, tracks: any[]) {},
}; 