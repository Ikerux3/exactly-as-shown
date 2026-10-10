import { afterEach, describe, expect, it, vi } from "vitest";
import { requestElevenLabsSpeech } from "./voice.provider.server";

const envNames = [
  "ELEVENLABS_ENABLED",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_GUEST_VOICE_ID",
  "ELEVENLABS_MOTHER_VOICE_ID",
  "ELEVENLABS_MIMIC_VOICE_ID",
  "ELEVENLABS_MODEL",
] as const;
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of envNames) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("ElevenLabs voice provider", () => {
  it("falls back without making a request when it is not configured", async () => {
    process.env["ELEVENLABS_ENABLED"] = "true";
    delete process.env["ELEVENLABS_API_KEY"];
    delete process.env["ELEVENLABS_GUEST_VOICE_ID"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestElevenLabsSpeech("Hello.", "guest")).resolves.toEqual({ available: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps credentials server-side and sends the documented low-latency model", async () => {
    process.env["ELEVENLABS_ENABLED"] = "true";
    process.env["ELEVENLABS_API_KEY"] = "secret-eleven-key";
    process.env["ELEVENLABS_GUEST_VOICE_ID"] = "guest-voice";
    delete process.env["ELEVENLABS_MODEL"];
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestElevenLabsSpeech("Hello.", "guest")).resolves.toMatchObject({
      available: true,
      mimeType: "audio/mpeg",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/guest-voice?output_format=mp3_44100_128");
    expect(url).not.toContain("secret-eleven-key");
    expect(init.headers).toMatchObject({ "xi-api-key": "secret-eleven-key" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      text: "Hello.",
      model_id: "eleven_flash_v2_5",
    });
  });

  it("makes no request while the explicit kill switch is off", async () => {
    process.env["ELEVENLABS_ENABLED"] = "false";
    process.env["ELEVENLABS_API_KEY"] = "secret-eleven-key";
    process.env["ELEVENLABS_GUEST_VOICE_ID"] = "guest-voice";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestElevenLabsSpeech("Stay still.", "guest")).resolves.toEqual({
      available: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
