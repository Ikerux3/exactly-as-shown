import { useEffect, useState } from "react";
import { CHAPTER_TITLE, useGame, type Line } from "./store";

const done = new Set<string>();
export function resetOnce() { done.clear(); }

/** Run scene intro exactly once per run (survives phase restarts). */
export function useSceneIntro(key: string, objective: string, lines: Line[], after?: () => void) {
  useEffect(() => {
    const s = useGame.getState();
    s.set({ objective, interactive: true });
    if (done.has(key)) return;
    done.add(key);
    if (lines.length) s.say(lines);
    after?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** "Chapter N" title card — once per run, not again when a scare restarts the phase. */
export function ChapterCard({ n }: { n: number }) {
  const [show, setShow] = useState(() => !done.has(`card-${n}`));
  useEffect(() => {
    done.add(`card-${n}`);
    const t = window.setTimeout(() => setShow(false), 2600);
    return () => window.clearTimeout(t);
  }, [n]);
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-void/80 animate-out fade-out duration-700 [animation-delay:1.9s] [animation-fill-mode:forwards]">
      <div className="text-center animate-float-up">
        <p className="font-hand text-sm uppercase tracking-[0.4em] text-muted-foreground">Chapter {n}</p>
        <p className="title-word mt-2 text-3xl text-paper">{CHAPTER_TITLE[n]}</p>
      </div>
    </div>
  );
}

export function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
