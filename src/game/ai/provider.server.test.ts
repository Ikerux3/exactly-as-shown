import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStructuredJSON } from "./provider.server";

const originalKey = process.env["GEMINI_API_KEY"];
const originalModel = process.env["GEMINI_MODEL"];

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env["GEMINI_API_KEY"];
  else process.env["GEMINI_API_KEY"] = originalKey;
  if (originalModel === undefined) delete process.env["GEMINI_MODEL"];
  else process.env["GEMINI_MODEL"] = originalModel;
});

describe("Gemini structured provider", () => {
  it("keeps the key out of the URL and requests JSON Schema output", async () => {
    process.env["GEMINI_API_KEY"] = "secret-test-key";
    delete process.env["GEMINI_MODEL"];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateStructuredJSON({ system: "system", prompt: "prompt", schema: { type: "object" } }),
    ).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain("secret-test-key");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "secret-test-key" });
    expect(JSON.parse(String(init.body)).generationConfig).toMatchObject({
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object" },
    });
  });

  it("fails before making a request when no server key is configured", async () => {
    delete process.env["GEMINI_API_KEY"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      generateStructuredJSON({ system: "system", prompt: "prompt", schema: {} }),
    ).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
