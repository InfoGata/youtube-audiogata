import { describe, expect, test, vi } from "vitest";
import { generateColdStartPoToken } from "../src/po-token";

// Mock bgutils-js
vi.mock("bgutils-js", () => ({
  BG: {
    PoToken: {
      generateColdStartToken: vi.fn((visitorData: string, clientState: number) => {
        return `cold_start_token_${visitorData}_${clientState}`;
      }),
    },
  },
}));

describe("generateColdStartPoToken", () => {
  test("should generate cold start token for the visitor data", () => {
    expect(generateColdStartPoToken("visitor-789")).toBe(
      "cold_start_token_visitor-789_1"
    );
  });

  test("should truncate visitor data to bgutils' 118 byte limit", () => {
    const token = generateColdStartPoToken("v".repeat(520));
    expect(token).toBe(`cold_start_token_${"v".repeat(118)}_1`);
  });
});
