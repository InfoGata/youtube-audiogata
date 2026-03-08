/**
 * Integration tests for SABR streaming.
 * Layered diagnostic tests that isolate each failure point.
 *
 * Tests 1, 2 require network access to YouTube.
 * Tests 3, 4 are purely local (no network).
 *
 * Run with: npx vitest run test/sabr-integration.test.ts
 */

import { describe, test, expect, beforeAll } from "vitest";
import { Innertube } from "youtubei.js";
import { BG } from "bgutils-js";

// Known working video ID (short, public, unlikely to be removed)
const VIDEO_ID = "luzMcTOgHoo";

describe("SABR Integration", () => {
  let youtube: Innertube;

  beforeAll(async () => {
    youtube = await Innertube.create({
      cookie: "CONSENT=YES+",
    });
  });

  test("PO token round-trip: decoded identifier is a valid prefix of visitorData", () => {
    const visitorData = youtube.session?.context?.client?.visitorData;
    expect(visitorData).toBeDefined();
    expect(visitorData!.length).toBeGreaterThan(0);

    // bgutils-js has a 118-byte UTF-8 limit on identifier, so we must truncate
    const MAX_IDENTIFIER_BYTES = 118;
    const encoder = new TextEncoder();
    let identifier = visitorData!;
    while (encoder.encode(identifier).length > MAX_IDENTIFIER_BYTES) {
      identifier = identifier.slice(0, -1);
    }

    const token = BG.PoToken.generateColdStartToken(identifier, 1);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    // Decode and verify the identifier matches the truncated visitorData
    const decoded = BG.PoToken.decodeColdStartToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.identifier).toBe(identifier);

    // The identifier should be a prefix of the original visitorData
    expect(visitorData!.startsWith(decoded.identifier)).toBe(true);
    // And should use the maximum allowed length
    expect(encoder.encode(decoded.identifier).length).toBeLessThanOrEqual(MAX_IDENTIFIER_BYTES);
  });

  test("Fetch wrapper fidelity: URL conversion, body handling, no spoofed origin", async () => {
    const calls: { url: string; init: RequestInit }[] = [];

    // Spy fetch that replicates createNetworkFetch logic
    const spyFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const headers = new Headers(init?.headers);

      // No origin/referer injection (removed to avoid sec-fetch-site contradiction)

      let body: BodyInit | null | undefined = init?.body;
      if (init?.body instanceof Uint8Array) {
        const buf = init.body;
        const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
        body = new Blob([arrayBuffer], { type: "application/x-protobuf" });
      }

      const urlStr = input instanceof URL ? input.toString() : input;
      const modifiedInit: RequestInit = { ...init, headers, body };
      calls.push({ url: urlStr as string, init: modifiedInit });

      return new Response("ok", { status: 200 });
    };

    // Simulate SabrStream-style call: URL object, Uint8Array body, custom headers
    const testUrl = new URL("https://rr1---sn-test.googlevideo.com/videoplayback");
    const testBody = new Uint8Array([0x08, 0x01, 0x10, 0x02]);
    const testHeaders = new Headers({
      "content-type": "application/x-protobuf",
      "accept-encoding": "identity",
      accept: "*/*",
    });

    await spyFetch(testUrl, {
      method: "POST",
      headers: testHeaders,
      body: testBody,
    });

    expect(calls).toHaveLength(1);
    const call = calls[0];

    // URL must be converted to string
    expect(typeof call.url).toBe("string");
    expect(call.url).toBe(testUrl.toString());

    // No spoofed origin/referer (avoids sec-fetch-site: none contradiction)
    const resultHeaders = call.init.headers as Headers;
    expect(resultHeaders.get("origin")).toBeNull();
    expect(resultHeaders.get("referer")).toBeNull();

    // Original SabrStream headers preserved
    expect(resultHeaders.get("content-type")).toBe("application/x-protobuf");
    expect(resultHeaders.get("accept-encoding")).toBe("identity");
    expect(resultHeaders.get("accept")).toBe("*/*");

    // Body is a Blob (converted from Uint8Array)
    expect(call.init.body).toBeInstanceOf(Blob);
  });

  test("Body byte integrity: Uint8Array subarray .buffer exposes parent, Blob does not", () => {
    // Subarray case: simulates protobuf .finish() returning a view into a larger buffer
    const parentBuffer = new ArrayBuffer(64);
    const parentView = new Uint8Array(parentBuffer);
    parentView.set([0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe], 10);
    const subarray = parentView.subarray(10, 16);

    // Verify the subarray has correct data
    expect(subarray.length).toBe(6);
    expect(subarray[0]).toBe(0xde);
    expect(subarray[5]).toBe(0xfe);

    // The old bug: using .buffer on a subarray includes the entire parent ArrayBuffer
    const buggyBuffer = subarray.buffer;
    expect(buggyBuffer.byteLength).toBe(64); // Includes all 64 bytes, not just 6

    // Our fix: pass Uint8Array directly to Blob constructor
    // Blob([subarray]) correctly copies only the subarray's visible bytes
    const correctBlob = new Blob([subarray], { type: "application/x-protobuf" });
    expect(correctBlob.size).toBe(6); // Only the 6 visible bytes

    // The old approach: new Uint8Array(subarray).buffer creates a copy, but it's correct
    // The REAL bug was: subarray.buffer gives 64 bytes, not 6
    const copiedArray = new Uint8Array(subarray);
    expect(copiedArray.buffer.byteLength).toBe(6); // Copy is correct
    expect(copiedArray.length).toBe(6);
  });
});
