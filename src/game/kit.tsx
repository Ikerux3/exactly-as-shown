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

/**
 * A hand-drawn crayon ring around something you can tap (percent of the frame).
 * Purely visual: it never takes clicks, so the hitbox underneath keeps working.
 * Render it through Stage's `above` so it shows both with the light on and in the dark.
 */
export function Hint({ x, y, w, h, label, faint, ring = true, labelTop }: {
  x: number; y: number; w: number; h: number; label?: string; faint?: boolean; ring?: boolean; labelTop?: boolean;
}) {
  return (
    <div className={`hint-mark ${faint ? "faint" : ""}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, pointerEvents: "none" }} aria-hidden>
      {ring && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <path d="M10 50 C7 22 38 5 62 8 C88 12 98 36 94 58 C90 84 58 96 35 92 C13 88 3 68 12 42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {label && <span className={`hint-label ${labelTop ? "top" : ""}`}>{label}</span>}
    </div>
  );
}

export function wait(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
}
