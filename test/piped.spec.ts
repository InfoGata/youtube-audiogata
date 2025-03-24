import {
  fetchInstances,
  getInstance,
  getCurrentInstance,
  getTrackByApiIdPiped,
  searchTracksPiped,
  searchPlaylistsPiped,
  getPlaylistTracksPiped,
  getYoutubeTrackPiped,
} from "../src/piped";

describe("piped.ts integration tests", () => {
  // Increase timeout for integration tests
  jest.setTimeout(30000);

  describe("fetchInstances", () => {
    it("should fetch and store instances", async () => {
      const instances = await fetchInstances();
      expect(Array.isArray(instances)).toBe(true);
      expect(instances.length).toBeGreaterThan(0);
      expect(instances[0]).toHaveProperty("api_url");
      expect(instances[0]).toHaveProperty("name");
      expect(instances[0]).toHaveProperty("version");
    });
  });

  describe("getInstance", () => {
    it("should return a valid instance URL", async () => {
      const instance = await getInstance();
      expect(typeof instance).toBe("string");
      expect(instance.startsWith("https://")).toBe(true);
    });
  });

  describe("getCurrentInstance", () => {
    it("should return a valid instance URL", async () => {
      const instance = await getCurrentInstance();
      expect(typeof instance).toBe("string");
      expect(instance.startsWith("https://")).toBe(true);
    });
  });

  describe("getTrackByApiIdPiped", () => {
    it("should fetch video data for a known video", async () => {
      // Using a known video ID (Rick Astley - Never Gonna Give You Up)
      const videoId = "dQw4w9WgXcQ";
      const video = await getTrackByApiIdPiped({ apiId: videoId });

      expect(video).toHaveProperty("name");
      expect(video).toHaveProperty("apiId", videoId);
      expect(video).toHaveProperty("images");
      expect(Array.isArray(video.images)).toBe(true);
      expect(video.images?.length).toBeGreaterThan(0);
      expect(video.images?.[0]).toHaveProperty("url");
      expect(video).toHaveProperty("duration");
    });
  });

  describe("getYoutubeTrackPiped", () => {
    it("should fetch audio stream URL for a known video", async () => {
      const videoId = "dQw4w9WgXcQ";
      const url = await getYoutubeTrackPiped({ apiId: videoId });
      
      expect(typeof url).toBe("string");
      expect(url.startsWith("https://")).toBe(true);
    });
  });

  describe("searchTracksPiped", () => {
    it("should search and return video results", async () => {
      const result = await searchTracksPiped({ query: "test" });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("name");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(Array.isArray(result.items[0].images)).toBe(true);
      expect(result.items[0].images?.length).toBeGreaterThan(0);
      expect(result.items[0].images?.[0]).toHaveProperty("url");
      expect(result.items[0]).toHaveProperty("duration");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("searchPlaylistsPiped", () => {
    it("should search and return playlist results", async () => {
      const result = await searchPlaylistsPiped({ query: "test" });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("name");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(Array.isArray(result.items[0].images)).toBe(true);
      expect(result.items[0].images?.length).toBeGreaterThan(0);
      expect(result.items[0].images?.[0]).toHaveProperty("url");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });

  describe("getPlaylistTracksPiped", () => {
    it("should fetch videos from a known playlist", async () => {
      const playlistId = "PLWsnao9n727MuFgH2vwhDQnB_M7GrG4HE";
      const result = await getPlaylistTracksPiped({ apiId: playlistId, isUserPlaylist: false });
      
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("name");
      expect(result.items[0]).toHaveProperty("apiId");
      expect(result.items[0]).toHaveProperty("images");
      expect(Array.isArray(result.items[0].images)).toBe(true);
      expect(result.items[0].images?.length).toBeGreaterThan(0);
      expect(result.items[0].images?.[0]).toHaveProperty("url");
      expect(result.items[0]).toHaveProperty("duration");
      expect(result).toHaveProperty("pageInfo");
      expect(result.pageInfo).toHaveProperty("nextPage");
    });
  });
}); 