import { beforeAll, describe, expect, test } from "vitest";
import { mockApplication } from "./mock-application";
import { canParseUrl } from "../src/index";

// Set up the mock application as the global application
beforeAll(() => {
  (global as any).application = mockApplication;
});

describe("index", () => {
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

  test("canParseUrl should return false on videos if type is playlist", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const canParse = await canParseUrl(url, "playlist");
    expect(canParse).toBeFalsy();
  });

  test("canParseUrl should return true on videos if type is track", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const canParse = await canParseUrl(url, "track");
    expect(canParse).toBeTruthy();
  });
});
