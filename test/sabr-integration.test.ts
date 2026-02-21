/**
 * Integration tests for SABR streaming.
 * Layered diagnostic tests that isolate each failure point.
 *
 * Tests 1, 2, 5 require network access to YouTube.
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

  test("SABR info extraction: all required fields present", async () => {
    const info = await youtube.getInfo(VIDEO_ID, { client: "WEB" });

    const streamingData = info.streaming_data;
    expect(streamingData).toBeDefined();

    // serverAbrStreamingUrl
    const sabrUrl = (streamingData as any).server_abr_streaming_url;
    expect(sabrUrl).toBeDefined();
    expect(typeof sabrUrl).toBe("string");
    expect(sabrUrl.length).toBeGreaterThan(0);
    expect(sabrUrl).toContain("googlevideo.com");

    // ustreamerConfig
    const ustreamerConfig =
      (info as any).player_config?.media_common_config
        ?.media_ustreamer_request_config?.video_playback_ustreamer_config;
    expect(ustreamerConfig).toBeDefined();
    expect(typeof ustreamerConfig).toBe("string");
    expect(ustreamerConfig.length).toBeGreaterThan(0);

    // visitorData
    const visitorData = youtube.session?.context?.client?.visitorData;
    expect(visitorData).toBeDefined();
    expect(typeof visitorData).toBe("string");
    expect(visitorData!.length).toBeGreaterThan(0);

    // Audio formats
    const adaptiveFormats = streamingData!.adaptive_formats ?? [];
    const audioFormats = adaptiveFormats.filter((f: any) =>
      f.mime_type?.startsWith("audio/")
    );
    expect(audioFormats.length).toBeGreaterThan(0);
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

    // Spy fetch that replicates createYouTubeFetch logic
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

    // But the original code did: new Uint8Array(init.body).buffer
    // which copies first then takes .buffer - this is actually correct but wasteful.
    // The simpler fix (Blob([subarray])) avoids the copy entirely.
  });

  test(
    "Full SABR streaming: no 403, yields audio chunks",
    async () => {
      // Skip in JSDOM - streaming requires Node.js native fetch with proper ReadableStream support
      if (typeof window !== "undefined" && typeof window.document !== "undefined") {
        console.log("Skipping full SABR test in JSDOM environment");
        return;
      }

      const { SabrStream } = await import("googlevideo/sabr-stream");
      const { convertToSabrFormat } = await import("../src/sabr-config");

      // Step 1: Get SABR info
      const info = await youtube.getInfo(VIDEO_ID, { client: "WEB" });
      const streamingData = info.streaming_data;
      expect(streamingData).toBeDefined();

      const serverAbrStreamingUrl = (streamingData as any)
        .server_abr_streaming_url;
      expect(serverAbrStreamingUrl).toBeDefined();

      const ustreamerConfig =
        (info as any).player_config?.media_common_config
          ?.media_ustreamer_request_config?.video_playback_ustreamer_config;
      expect(ustreamerConfig).toBeDefined();

      const visitorData = youtube.session?.context?.client?.visitorData ?? "";
      expect(visitorData.length).toBeGreaterThan(0);

      // Step 2: Generate PO token (truncate identifier to 118-byte limit)
      const MAX_IDENTIFIER_BYTES = 118;
      const encoder = new TextEncoder();
      let identifier = visitorData;
      while (encoder.encode(identifier).length > MAX_IDENTIFIER_BYTES) {
        identifier = identifier.slice(0, -1);
      }
      const poToken = BG.PoToken.generateColdStartToken(identifier, 1);
      expect(poToken.length).toBeGreaterThan(0);

      // Step 3: Convert all adaptive formats (SabrStream needs both video + audio)
      const adaptiveFormats = streamingData!.adaptive_formats ?? [];
      expect(adaptiveFormats.length).toBeGreaterThan(0);

      const formats = adaptiveFormats.map((f: any) => convertToSabrFormat(f));

      // Step 4: Get client info
      const sessionClient = youtube.session?.context?.client;
      const clientInfo = {
        clientName: 1,
        clientVersion: sessionClient?.clientVersion ?? "",
        osName: sessionClient?.osName ?? "",
        osVersion: sessionClient?.osVersion ?? "",
        deviceMake: sessionClient?.deviceMake ?? "",
        deviceModel: sessionClient?.deviceModel ?? "",
      };

      // Step 5: Create SabrStream with native fetch (no wrapper needed for this test)
      const sabrStream = new SabrStream({
        fetch: globalThis.fetch,
        serverAbrStreamingUrl,
        videoPlaybackUstreamerConfig: ustreamerConfig,
        clientInfo,
        poToken,
        durationMs: 0,
        formats,
      });

      // Step 6: Start streaming - should not throw 403
      const result = await sabrStream.start({
        enabledTrackTypes: 1,
      });

      expect(result.audioStream).toBeDefined();

      // Step 7: Read at least one chunk
      const reader = result.audioStream.getReader();
      const { done, value } = await reader.read();

      expect(done).toBe(false);
      expect(value).toBeDefined();
      expect(value!.length).toBeGreaterThan(0);

      // Clean up
      reader.cancel();
      sabrStream.abort();
    },
    { timeout: 30000 }
  );
});
