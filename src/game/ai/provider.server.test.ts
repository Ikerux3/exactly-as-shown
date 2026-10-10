import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStructuredJSON } from "./provider.server";

describe("Lovable AI structured provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends a JSON-schema request with the server key and parses the reply", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      generateStructuredJSON({ system: "s", prompt: "p", schema: { type: "object" } }),
    ).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("ai.gateway.lovable.dev");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-key");
    expect(JSON.parse(init.body).response_format.json_schema.schema).toEqual({ type: "object" });
  });

  it("fails before making a request when no server key is configured", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      generateStructuredJSON({ system: "s", prompt: "p", schema: {} }),
    ).rejects.toThrow("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
