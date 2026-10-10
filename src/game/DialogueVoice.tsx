import { useEffect, useRef } from "react";
import { useGame, type Line } from "./store";
import { cancelBrowserSpeech, speakWithBrowser, type VoiceRole } from "./voice";
import { synthesizeDialogueVoice } from "./voice.functions";

const REMOTE_WAIT_MS = 700;

function roleForLine(line: Line): VoiceRole | null {
  if (line.speaker === "mother") return "mother";
  if (line.speaker === "mimic") return "mimic";
  if (line.speaker === "guest") return "guest";
  return null;
}

/** Speaks character dialogue without ever delaying subtitle progression. */
export function useDialogueVoice() {
  const line = useGame((state) => state.line);
  const muted = useGame((state) => state.muted);
  const paused = useGame((state) => state.paused);
  const remoteAudio = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    let fallbackStarted = false;

    const stopRemote = () => {
      const current = remoteAudio.current;
      remoteAudio.current = null;
      if (!current) return;
      current.audio.onended = null;
      current.audio.onerror = null;
      current.audio.pause();
      URL.revokeObjectURL(current.url);
    };
    const stopAll = () => {
      stopRemote();
      cancelBrowserSpeech();
    };

    stopAll();
    const role = line ? roleForLine(line) : null;
    if (!line || !role || muted || paused) {
      return () => {
        active = false;
        stopAll();
      };
    }

    const text = line.text.trim();
    const browserFallback = () => {
      if (!active || fallbackStarted) return;
      fallbackStarted = true;
      stopRemote();
      speakWithBrowser(text, undefined, { role });
    };

    const waitTimer = window.setTimeout(browserFallback, REMOTE_WAIT_MS);
    void synthesizeDialogueVoice({ data: { role, text } })
      .then((result) => {
        if (!active || fallbackStarted) return;
        window.clearTimeout(waitTimer);
        if (!result.available || typeof Audio === "undefined") {
          browserFallback();
          return;
        }

        const binary = atob(result.audioBase64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
        const audio = new Audio(url);
        if (role === "mimic") audio.playbackRate = 0.96;
        audio.onended = stopRemote;
        audio.onerror = browserFallback;
        remoteAudio.current = { audio, url };
        void audio.play().catch(browserFallback);
      })
      .catch(browserFallback);

    return () => {
      active = false;
      window.clearTimeout(waitTimer);
      stopAll();
    };
  }, [line, muted, paused]);
}
