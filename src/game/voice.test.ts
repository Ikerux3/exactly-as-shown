import { describe, expect, it, vi } from "vitest";
import { cancelBrowserSpeech, speakWithBrowser, type SpeechRuntime } from "./voice";

class FakeUtterance {
  lang = "";
  pitch = 1;
  rate = 1;
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function runtime(voices: SpeechSynthesisVoice[] = []) {
  const cancel = vi.fn();
  const speak = vi.fn();
  return {
    cancel,
    speak,
    value: {
      synthesis: { cancel, getVoices: () => voices, speak },
      Utterance: FakeUtterance,
    } as unknown as SpeechRuntime,
  };
}

describe("browser dialogue voice fallback", () => {
  it("configures and speaks a quiet English Guest voice", () => {
    const english = { lang: "en-GB", name: "British Voice" } as SpeechSynthesisVoice;
    const speech = runtime([english]);

    expect(speakWithBrowser("  Come closer.  ", speech.value, { role: "guest" })).toBe(true);
    expect(speech.cancel).toHaveBeenCalledOnce();
    const utterance = speech.speak.mock.calls[0]?.[0] as unknown as FakeUtterance;
    expect(utterance.text).toBe("Come closer.");
    expect(utterance.voice).toBe(english);
    expect(utterance.lang).toBe("en-US");
    expect(utterance.rate).toBeLessThan(1);
    expect(utterance.pitch).toBeLessThan(1);
  });

  it("uses David for The Guest and Zira for mother and mimic", () => {
    const david = { lang: "en-US", name: "Microsoft David Desktop" } as SpeechSynthesisVoice;
    const zira = { lang: "en-US", name: "Microsoft Zira Desktop" } as SpeechSynthesisVoice;
    const speech = runtime([zira, david]);

    speakWithBrowser("I see you.", speech.value, { role: "guest" });
    speakWithBrowser("Be good.", speech.value, { role: "mother" });
    speakWithBrowser("Come here.", speech.value, { role: "mimic" });

    const utterances = speech.speak.mock.calls.map((call) => call[0] as unknown as FakeUtterance);
    expect(utterances[0]?.voice).toBe(david);
    expect(utterances[1]?.voice).toBe(zira);
    expect(utterances[2]?.voice).toBe(zira);
    expect(utterances[2]?.pitch).toBeLessThan(utterances[1]?.pitch ?? 0);
  });

  it("leaves subtitles as fallback and cancels safely", () => {
    expect(speakWithBrowser("Still visible.", null)).toBe(false);
    const speech = runtime();
    cancelBrowserSpeech(speech.value);
    expect(speech.cancel).toHaveBeenCalledOnce();
  });
});
