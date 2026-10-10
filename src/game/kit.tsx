import { useEffect, useState } from "react";
import { CHAPTER_TITLE, useGame, type Line } from "./store";
import { Ransom } from "./fx";

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
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-void/90 animate-out fade-out duration-700 [animation-delay:1.9s] [animation-fill-mode:forwards]">
      <div className="px-6 text-center animate-float-up">
        <p className="font-crayon text-xl text-crimson">chapter {n}</p>
        <div className="mt-3 text-3xl"><Ransom text={CHAPTER_TITLE[n] ?? ""} seed={n * 13} /></div>
      </div>
    </div>
  );
}

export function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
