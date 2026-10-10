// Shared screen chrome: a fixed 2:3 art frame with a HUD bar above it and a dialogue bar
// below it, so subtitles, objectives and controls never cover the scene art or its hitboxes.
import { useEffect, type ReactNode, type Ref } from "react";
import { Brain, Pause } from "lucide-react";
import { CHAPTER_TITLE, useGame } from "./store";
import { stopMusic } from "./audio";
import { GUEST_MIND_LABEL } from "./guest";

type ShellProps = {
  /** Show the HUD / dialogue bars. Without them the art fills the shell on phones. */
  bars?: boolean;
  top?: ReactNode;
  bottom?: ReactNode;
  /** Layers that cover the whole shell (pause menu, full scare). */
  overlay?: ReactNode;
  frameRef?: Ref<HTMLDivElement>;
  frameClassName?: string;
  onFramePointer?: (e: React.PointerEvent) => void;
  children: ReactNode;
};

export function Shell({
  bars = true,
  top,
  bottom,
  overlay,
  frameRef,
  frameClassName = "",
  onFramePointer,
  children,
}: ShellProps) {
  return (
    <div className={`game-shell ${bars ? "" : "no-bars"}`}>
      <div className="shell-bar top">{bars && top}</div>
      <div
        ref={frameRef}
        className={`game-frame ${frameClassName}`}
        onPointerMove={onFramePointer}
        onPointerDown={onFramePointer}
      >
        {children}
      </div>
      <div className="shell-bar bottom">{bars && bottom}</div>
      {overlay}
    </div>
  );
}

/** Auto-advances subtitles (paused with the game) and fires each line's onShow once. */
export function useSubtitles() {
  const line = useGame((s) => s.line);
  const paused = useGame((s) => s.paused);
  useEffect(() => {
    line?.onShow?.();
  }, [line]);
  useEffect(() => {
    if (!line || paused) return;
    const ms = line.ms ?? Math.max(2200, line.text.length * 55);
    const t = window.setTimeout(() => useGame.getState().nextLine(), ms);
    return () => window.clearTimeout(t);
  }, [line, paused]);
}

const SPEAKER: Record<string, string> = {
  mother: "Mommy",
  mimic: "Mommy",
  guest: "…",
  child: "You",
};

/** Bottom bar: the current subtitle (tap to skip) or, when nobody is talking, Mommy's list. */
export function DialogueBar({ right }: { right?: ReactNode }) {
  const line = useGame((s) => s.line);
  const objective = useGame((s) => s.objective);
  const guest = !!line && (line.speaker === "guest" || line.speaker === "mimic");
  return (
    <>
      {line ? (
        <button
          type="button"
          onClick={() => useGame.getState().nextLine(true)}
          className={`subtitle dialogue-panel ${guest ? "guest" : ""}`}
          aria-live="polite"
          aria-label={`${line.text} — tap to continue`}
        >
          {line.speaker !== "narrator" && (
            <span className="speaker-tag dialogue-label">{SPEAKER[line.speaker]}</span>
          )}
          <span key={line.text} className="block animate-float-up">
            {line.text}
          </span>
        </button>
      ) : (
        <div
          className={`subtitle dialogue-panel ${objective ? "" : "is-empty"}`}
          aria-live="polite"
        >
          {objective && (
            <>
              <span className="speaker-tag dialogue-label">Mommy's list</span>
              <span key={objective} className="block leading-snug animate-float-up">
                {objective}
              </span>
            </>
          )}
        </div>
      )}
      {right}
    </>
  );
}

export function CorduraMeter({ value }: { value: number }) {
  const high = value >= 65;
  return (
    <div
      className="chip flex shrink-0 items-center gap-2 px-3 py-1.5"
      role="meter"
      aria-label="Cordura"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span className="hidden font-display text-[10px] uppercase tracking-[0.16em] @xs:inline">
        Cordura
      </span>
      <Brain className="h-3.5 w-3.5 @xs:hidden" strokeWidth={2.25} aria-hidden />
      <span className="relative block h-2 w-12 overflow-hidden rounded-full bg-paper-deep shadow-inner @sm:w-14">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700"
          style={{ width: `${value}%`, background: high ? "var(--crimson)" : "var(--c-navy)" }}
        />
      </span>
    </div>
  );
}

/** Top bar for chapters: where you are, how far along, Cordura and pause. */
export function ChapterBar({
  chapter,
  progress,
}: {
  chapter: number;
  progress?: string | undefined;
}) {
  const cordura = useGame((s) => s.cordura);
  return (
    <>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-[13px] text-paper/85" title={`Chapter ${chapter}`}>
          <span className="text-paper/50">{chapter} ·</span> {CHAPTER_TITLE[chapter]}
        </p>
        {progress && (
          <p key={progress} className="truncate font-hand text-[15px] text-honey animate-float-up">
            {progress}
          </p>
        )}
      </div>
      <CorduraMeter value={cordura} />
      <PauseButton />
    </>
  );
}

export function PauseButton() {
  return (
    <button
      type="button"
      className="chip grid h-9 w-9 shrink-0 place-items-center"
      aria-label="Pause"
      onClick={() => useGame.getState().set({ paused: true })}
    >
      <Pause className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

/** Escape toggles the pause menu on keyboards. */
export function usePauseKey(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useGame.getState();
      s.set({ paused: !s.paused });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function PauseMenu() {
  const muted = useGame((s) => s.muted);
  const s = useGame.getState();
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-void/75 p-6 backdrop-blur-[2px] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
    >
      <div className="paper w-full max-w-xs space-y-3 p-6 text-center animate-float-up">
        <p className="title-word text-2xl">Paused</p>
        <button
          type="button"
          className="stitch-btn honey w-full"
          onClick={() => s.set({ paused: false })}
        >
          Back to the house
        </button>
        <button
          type="button"
          className="stitch-btn sage w-full"
          onClick={() => s.setMute(!muted)}
          aria-pressed={!muted}
        >
          {muted ? "Sound: off" : "Sound: on"}
        </button>
        <button
          type="button"
          className="stitch-btn w-full"
          onClick={() => {
            stopMusic();
            s.go("title");
          }}
        >
          Quit to menu
        </button>
        <p className="pt-1 text-xs leading-snug opacity-70">
          Progress is kept from the start of this chapter.
        </p>
        <p className="text-[10px] leading-snug opacity-50">{GUEST_MIND_LABEL}</p>
      </div>
    </div>
  );
}
