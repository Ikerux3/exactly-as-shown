export const VOICE_ROLES = ["guest", "mother", "mimic"] as const;
export type VoiceRole = (typeof VOICE_ROLES)[number];

export function voiceRoleForSpeaker(speaker: string): VoiceRole | null {
  return VOICE_ROLES.find((role) => role === speaker) ?? null;
}

export function lineDisplayMs(text: string, configuredMs?: number): number {
  return configuredMs ?? Math.max(2200, text.length * 55);
}

/** Last-resort escape hatch when a browser never emits speech completion events. */
export function voiceSafetyMs(text: string, configuredMs?: number): number {
  return Math.max(lineDisplayMs(text, configuredMs), Math.min(45_000, 12_000 + text.length * 120));
}

export type SpeechRuntime = {
  synthesis: Pick<SpeechSynthesis, "cancel" | "getVoices" | "speak">;
  Utterance: new (text: string) => SpeechSynthesisUtterance;
};

type SpeechOptions = {
  onEnd?: () => void;
  role?: VoiceRole;
};

export function getSpeechRuntime(): SpeechRuntime | null {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof window.SpeechSynthesisUtterance !== "function"
  ) {
    return null;
  }

  return {
    synthesis: window.speechSynthesis,
    Utterance: window.SpeechSynthesisUtterance,
  };
}

function preferredVoice(voices: SpeechSynthesisVoice[], role: VoiceRole) {
  const preferredName = role === "guest" ? "david" : "zira";
  return (
    voices.find((voice) => voice.name.toLowerCase().includes(preferredName)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

/** Browser/device TTS fallback. Visible subtitles remain authoritative. */
export function speakWithBrowser(
  text: string,
  runtime: SpeechRuntime | null = getSpeechRuntime(),
  options: SpeechOptions = {},
): boolean {
  const line = text.trim();
  if (!line || !runtime) return false;

  try {
    runtime.synthesis.cancel();
    const utterance = new runtime.Utterance(line);
    const role = options.role ?? "guest";
    utterance.lang = "en-US";
    utterance.rate = role === "mother" ? 0.96 : role === "mimic" ? 0.9 : 0.88;
    utterance.pitch = role === "mother" ? 1 : role === "mimic" ? 0.84 : 0.62;
    utterance.volume = role === "guest" ? 0.82 : 0.9;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      options.onEnd?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    utterance.voice = preferredVoice(runtime.synthesis.getVoices(), role);
    runtime.synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function cancelBrowserSpeech(runtime: SpeechRuntime | null = getSpeechRuntime()) {
  try {
    runtime?.synthesis.cancel();
  } catch {
    // Some browsers expose the API while blocking it at runtime.
  }
}
