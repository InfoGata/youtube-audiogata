import { canParseUrl } from "../src/index";

describe("index", () => {
  (global as any).application = {};
  test("canParseUrl should detect youtube playlists", async () => {
    const url =
      "https://www.youtube.com/playlist?list=PLuUrokoVSgG6XWUdX-ZzSVzz1TgTJJbp4";
    const canParse = await canParseUrl(url, "playlist");
    expect(canParse).toBeTruthy();
  });

  test("canParseUrl should detect youtube playlists on videos", async () => {
    const url =
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLuUrokoVSgG6XWUdX-ZzSVzz1TgTJJbp4";
    const canParse = await canParseUrl(url, "playlist");
    expect(canParse).toBeTruthy();
  });

  test("canParseUrl should return false on videos", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const canParse = await canParseUrl(url, "playlist");
    expect(canParse).toBeFalsy();
  });
});
