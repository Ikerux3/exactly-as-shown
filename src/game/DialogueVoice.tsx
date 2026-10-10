import { useEffect, useRef } from "react";
import { useGame, type Line } from "./store";
import { cancelBrowserSpeech, lineDisplayMs, speakWithBrowser, voiceRoleForSpeaker } from "./voice";
import { synthesizeDialogueVoice } from "./voice.functions";

/** Sends a question rendered inside another UI panel through the same global voice queue. */
export function useSpokenPrompt(
  text: string,
  speaker: "mother" | "guest" | "mimic",
  active = true,
) {
  useEffect(() => {
    const clean = text.trim();
    if (!active || !clean) return;
    const prompt: Line = { speaker, text: clean, voiceOnly: true };
    useGame.getState().say(prompt);
    return () => {
      const state = useGame.getState();
      if (state.line === prompt) {
        const [next, ...rest] = state.queue;
        state.set({ line: next, queue: rest });
      } else if (state.queue.includes(prompt)) {
        state.set({ queue: state.queue.filter((queued) => queued !== prompt) });
      }
    };
  }, [active, speaker, text]);
}

/** Speaks character dialogue and keeps its subtitle/prompt alive until speech finishes. */
export function useDialogueVoice() {
  const line = useGame((state) => state.line);
  const muted = useGame((state) => state.muted);
  const paused = useGame((state) => state.paused);
  const remoteAudio = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    let finished = false;
    let completionTimer: number | undefined;
    const startedAt = Date.now();

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
    const role = line ? voiceRoleForSpeaker(line.speaker) : null;
    if (!line || !role || muted || paused) {
      return () => {
        active = false;
        stopAll();
      };
    }

    const text = line.text.trim();
    const finishLine = () => {
      if (!active || finished) return;
      finished = true;
      stopAll();
      const remaining = Math.max(0, lineDisplayMs(text, line.ms) - (Date.now() - startedAt));
      completionTimer = window.setTimeout(() => {
        if (active && useGame.getState().line === line) useGame.getState().nextLine();
      }, remaining);
    };
    const browserFallback = () => {
      if (!active || finished) return;
      stopRemote();
      const started = speakWithBrowser(text, undefined, { role, onEnd: finishLine });
      if (!started) finishLine();
    };

    void synthesizeDialogueVoice({ data: { role, text } })
      .then((result) => {
        if (!active || finished) return;
        if (!result.available || typeof Audio === "undefined") {
          browserFallback();
          return;
        }

        const binary = atob(result.audioBase64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
        const audio = new Audio(url);
        if (role === "mimic") audio.playbackRate = 0.96;
        audio.onended = finishLine;
        audio.onerror = browserFallback;
        remoteAudio.current = { audio, url };
        void audio.play().catch(browserFallback);
      })
      .catch(browserFallback);

    return () => {
      active = false;
      if (completionTimer !== undefined) window.clearTimeout(completionTimer);
      stopAll();
    };
  }, [line, muted, paused]);
}
