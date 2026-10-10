import type { VoiceRole } from "./voice";

export type ElevenLabsUnavailableReason =
  | "disabled"
  | "missing_api_key"
  | "missing_voice_id";

export type ElevenLabsSpeechResult =
  | { available: false; reason: ElevenLabsUnavailableReason }
  | { available: true; audioBase64: string; mimeType: "audio/mpeg" };

const DEFAULT_MODEL = "eleven_flash_v2_5";
const MAX_AUDIO_BYTES = 2_500_000;
const REQUEST_TIMEOUT_MS = 8_000;

export function elevenLabsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["ELEVENLABS_ENABLED"]?.trim().toLowerCase() === "true";
}

function voiceIdForRole(role: VoiceRole): string | undefined {
  const guest = process.env["ELEVENLABS_GUEST_VOICE_ID"]?.trim();
  const mother =
    process.env["ELEVENLABS_MOTHER_VOICE_ID"]?.trim() ||
    process.env["ELEVENLABS_MOM_VOICE_ID"]?.trim() ||
    guest;
  if (role === "mother") return mother;
  if (role === "mimic") {
    return (
      process.env["ELEVENLABS_MIMIC_VOICE_ID"]?.trim() ||
      process.env["ELEVENLABS_MOM_IMPOSTOR_VOICE_ID"]?.trim() ||
      mother
    );
  }
  return guest;
}

function voiceSettings(role: VoiceRole) {
  if (role === "mother") {
    return { stability: 0.62, similarity_boost: 0.78, style: 0.08, use_speaker_boost: true };
  }
  if (role === "mimic") {
    return { stability: 0.42, similarity_boost: 0.8, style: 0.18, use_speaker_boost: true };
  }
  return { stability: 0.48, similarity_boost: 0.76, style: 0.16, use_speaker_boost: true };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Server-only request. API key and voice IDs never enter the client bundle. */
export async function requestElevenLabsSpeech(
  text: string,
  role: VoiceRole,
): Promise<ElevenLabsSpeechResult> {
  if (!elevenLabsEnabled()) {
    console.warn("[voice] ElevenLabs unavailable: disabled");
    return { available: false, reason: "disabled" };
  }
  const apiKey = process.env["ELEVENLABS_API_KEY"]?.trim();
  const voiceId = voiceIdForRole(role);
  if (!apiKey) {
    console.warn("[voice] ElevenLabs unavailable: missing_api_key");
    return { available: false, reason: "missing_api_key" };
  }
  if (!voiceId) {
    console.warn(`[voice] ElevenLabs unavailable for ${role}: missing_voice_id`);
    return { available: false, reason: "missing_voice_id" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: process.env["ELEVENLABS_MODEL"]?.trim() || DEFAULT_MODEL,
          voice_settings: voiceSettings(role),
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      console.error(`[voice] ElevenLabs ${role} HTTP ${response.status}`);
      throw new Error(`ElevenLabs unavailable (${response.status})`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_AUDIO_BYTES) {
      throw new Error("Invalid ElevenLabs audio response");
    }
    console.info(`[voice] ElevenLabs ${role} ready (${bytes.length} bytes)`);
    return { available: true, audioBase64: bytesToBase64(bytes), mimeType: "audio/mpeg" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[voice] ElevenLabs ${role} timed out`);
      throw new Error("ElevenLabs unavailable (timeout)");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
