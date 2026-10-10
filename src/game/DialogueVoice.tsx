import { useEffect, useRef } from "react";
import { useGame, type Line } from "./store";
import { cancelBrowserSpeech, lineDisplayMs, voiceRoleForSpeaker } from "./voice";
import { blip } from "./audio";

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
    // Undertale-style blips: one pulse per letter, then the line holds for reading time.
    const chars = [...text];
    let i = 0;
    const step = role === "guest" ? 62 : 42;
    const tick = () => {
      if (!active || finished) return;
      while (i < chars.length && !/[\p{L}\p{N}]/u.test(chars[i]!)) i++;
      if (i >= chars.length) return finishLine();
      blip(role);
      i += role === "guest" ? 2 : 1;
      const pause = /[.,!?…]/.test(chars[i - 1] ?? "") ? 180 : 0;
      completionTimer = window.setTimeout(tick, step + pause);
    };
    tick();

    return () => {
      active = false;
      if (completionTimer !== undefined) window.clearTimeout(completionTimer);
      stopAll();
    };
  }, [line, muted, paused]);
}
