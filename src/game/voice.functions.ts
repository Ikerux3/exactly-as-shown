import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { VOICE_ROLES } from "./voice";
import { requestElevenLabsSpeech, type ElevenLabsSpeechResult } from "./voice.provider.server";

const requestSchema = z.object({
  role: z.enum(VOICE_ROLES),
  text: z.string().trim().min(1).max(300),
});

const cache = new Map<string, Promise<ElevenLabsSpeechResult>>();
const MAX_CACHE_ENTRIES = 64;

export const synthesizeDialogueVoice = createServerFn({ method: "POST" })
  .validator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }): Promise<ElevenLabsSpeechResult> => {
    const cacheKey = `${data.role}\n${data.text}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value ?? "");
    const pending = requestElevenLabsSpeech(data.text, data.role).catch((error) => {
      cache.delete(cacheKey);
      throw error;
    });
    cache.set(cacheKey, pending);
    return pending;
  });
