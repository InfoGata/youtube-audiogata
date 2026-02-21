import { describe, expect, test, beforeEach, vi } from "vitest";
import {
  getCachedToken,
  cacheToken,
  isTokenValid,
  clearCachedToken,
  generateColdStartPoToken,
  getPoToken,
} from "../src/po-token";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Mock bgutils-js
vi.mock("bgutils-js", () => ({
  BG: {
    PoToken: {
      generateColdStartToken: vi.fn((visitorData: string, clientState: number) => {
        return `cold_start_token_${visitorData}_${clientState}`;
      }),
    },
    Challenge: {
      create: vi.fn(),
    },
  },
}));

describe("po-token", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("getCachedToken", () => {
    test("should return null when no token is cached", () => {
      const result = getCachedToken();
      expect(result).toBeNull();
    });

    test("should return cached token when valid", () => {
      const cached = {
        token: "test-token",
        visitorData: "visitor-123",
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };
      localStorageMock.setItem("po_token_cache", JSON.stringify(cached));

      const result = getCachedToken();
      expect(result).toEqual(cached);
    });

    test("should return null and clear expired token", () => {
      const cached = {
        token: "test-token",
        visitorData: "visitor-123",
        expiresAt: Date.now() - 1000, // 1 second ago (expired)
      };
      localStorageMock.setItem("po_token_cache", JSON.stringify(cached));

      const result = getCachedToken();
      expect(result).toBeNull();
      expect(localStorageMock.getItem("po_token_cache")).toBeNull();
    });

    test("should return null for invalid JSON", () => {
      localStorageMock.setItem("po_token_cache", "invalid-json");

      const result = getCachedToken();
      expect(result).toBeNull();
    });
  });

  describe("cacheToken", () => {
    test("should cache token with correct structure", () => {
      cacheToken("my-token", "visitor-456");

      const cached = JSON.parse(localStorageMock.getItem("po_token_cache")!);
      expect(cached.token).toBe("my-token");
      expect(cached.visitorData).toBe("visitor-456");
      expect(cached.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe("isTokenValid", () => {
    test("should return false when no token is cached", () => {
      expect(isTokenValid("visitor-123")).toBe(false);
    });

    test("should return true when token matches visitor data", () => {
      cacheToken("token", "visitor-123");
      expect(isTokenValid("visitor-123")).toBe(true);
    });

    test("should return false when visitor data does not match", () => {
      cacheToken("token", "visitor-123");
      expect(isTokenValid("visitor-456")).toBe(false);
    });
  });

  describe("clearCachedToken", () => {
    test("should clear cached token", () => {
      cacheToken("token", "visitor-123");
      expect(getCachedToken()).not.toBeNull();

      clearCachedToken();
      expect(getCachedToken()).toBeNull();
    });
  });

  describe("generateColdStartPoToken", () => {
    test("should generate and cache cold start token", () => {
      const token = generateColdStartPoToken("visitor-789");

      expect(token).toBe("cold_start_token_visitor-789_1");
      expect(getCachedToken()?.token).toBe("cold_start_token_visitor-789_1");
    });
  });

  describe("getPoToken", () => {
    test("should return cached token when available", async () => {
      cacheToken("cached-token", "visitor-123");

      const token = await getPoToken("visitor-123");
      expect(token).toBe("cached-token");
    });

    test("should generate new token when cache is empty", async () => {
      const token = await getPoToken("visitor-new");
      expect(token).toBe("cold_start_token_visitor-new_1");
    });

    test("should generate new token when visitor data differs", async () => {
      cacheToken("old-token", "old-visitor");

      const token = await getPoToken("new-visitor");
      expect(token).toBe("cold_start_token_new-visitor_1");
    });
  });
});
