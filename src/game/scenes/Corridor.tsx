// Between chapters: the child walks down the upstairs hall to the next room. A real CSS-3D
// corridor (papered walls, wainscot, a runner rug, hanging lamps, family photos), the child cut-out
// walking ahead of the camera, and at the end the door with the room's name. When it opens you
// glimpse the next room. Each hall is a little worse than the last.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { BG } from "../assets";
import { CHAPTER_TITLE, useGame, type Screen } from "../store";
import { sfx } from "../audio";
import { ChildCutout, ChildDoll } from "../Props";
import { loadProfile } from "../profile";
import { Ransom } from "../fx";
import { Shell } from "../Shell";
import { ClosedDoor } from "./Prologue";

export const CHAPTER_OF: Partial<Record<Screen, number>> = { ch1: 1, ch2k: 2, ch2d: 2, ch3: 3, ch4: 4, ch5: 5 };

/**
 * Watches screen changes: moving forward from one chapter to the next plays the hall first.
 * The new chapter is held back (and the game paused, so any line it queued waits) until the
 * child reaches the door. Restarts, kitchen→dining and menus are untouched; those keep the
 * photo-snap veil, which is why the veil gets its own screen value.
 */
export function useCorridorTransitions() {
  const [corridor, setCorridor] = useState<{ from: Screen; to: Screen } | null>(null);
  const [veilScreen, setVeilScreen] = useState<Screen>(() => useGame.getState().screen);
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.screen === prev.screen) return;
        const from = CHAPTER_OF[prev.screen];
        const to = CHAPTER_OF[s.screen];
        if (from && to && to > from) {
          useGame.setState({ paused: true });
          setCorridor({ from: prev.screen, to: s.screen });
        } else {
          setCorridor(null);
          setVeilScreen(s.screen);
        }
      }),
    [],
  );
  const endCorridor = useCallback(() => {
    setCorridor(null);
    useGame.setState({ paused: false });
  }, []);
  return { corridor, veilScreen, endCorridor };
}

/** Where each chapter's door leads, what is written on it, and what you hear on the way. */
const DESTINATION: Record<number, { label: string; room: string; caption: string }> = {
  2: { label: "kitchen", room: BG.bgKitchen, caption: "Downstairs, someone is setting the table." },
  3: { label: "your room", room: BG.bgBedroom, caption: "Upstairs, your music box is playing by itself." },
  4: { label: "mommy's room", room: BG.bgMother, caption: "At the end of the hall, a voice you know is calling." },
  5: { label: "bathroom", room: BG.bgBathroom, caption: "Almost bedtime. Don't look at the doors." },
};

/** Corridor length and the two stops of the camera (cqw: % of the frame's width). */
const L = 640;
const WALK_TO = L - 150;
const ARRIVE_TO = L - 55;
const WALK_MS = 5000;
const ARRIVE_MS = 1300;
const THROUGH_MS = 700;

type Phase = "start" | "walk" | "arrive" | "through";

export function Corridor({ to, onDone }: { to: Screen; onDone: () => void }) {
  const chapter = CHAPTER_OF[to] ?? 2;
  const dest = DESTINATION[chapter] ?? DESTINATION[2]!;
  const favColor = useGame((s) => s.favColor);
  const [look] = useState(() => loadProfile()?.look);
  const [phase, setPhase] = useState<Phase>("start");
  // Later halls get worse: a lamp that won't stay on, then a door left ajar, then a whisper.
  const flicker = chapter >= 3;
  const ajar = chapter >= 4;

  useEffect(() => {
    const ts = [
      window.setTimeout(() => setPhase("walk"), 40),
      window.setTimeout(() => { setPhase("arrive"); sfx("creak"); }, 40 + WALK_MS),
      window.setTimeout(() => { sfx("door"); }, 40 + WALK_MS + 500),
      window.setTimeout(() => setPhase("through"), 40 + WALK_MS + ARRIVE_MS),
      window.setTimeout(onDone, 40 + WALK_MS + ARRIVE_MS + THROUGH_MS),
    ];
    if (ajar) ts.push(window.setTimeout(() => sfx("whisper"), 2600));
    const steps = window.setInterval(() => sfx("step"), 470);
    ts.push(window.setTimeout(() => window.clearInterval(steps), 40 + WALK_MS + 700));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDone(); };
    window.addEventListener("keydown", onKey);
    return () => { ts.forEach((t) => window.clearTimeout(t)); window.clearInterval(steps); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const z = phase === "start" ? 0 : phase === "walk" ? WALK_TO : ARRIVE_TO;
  const world: CSSProperties = {
    transform: `translateZ(${z}cqw)`,
    transition: phase === "walk" ? `transform ${WALK_MS}ms cubic-bezier(.35,.1,.55,1)` : phase === "start" ? "none" : `transform ${ARRIVE_MS}ms ease-in-out`,
  };
  const open = phase === "arrive" || phase === "through";

  return (
    <Shell
      top={
        <>
          <p className="min-w-0 flex-1 truncate font-display text-[13px] text-paper/85">
            <span className="text-paper/50">{chapter} ·</span> {CHAPTER_TITLE[chapter]}
          </p>
          <button type="button" className="chip shrink-0 px-3 py-1.5 font-display text-sm" onClick={onDone}>Skip ›</button>
        </>
      }
      bottom={
        <div className="subtitle dialogue-panel" aria-live="polite">
          <span className="block leading-snug animate-float-up">{dest.caption}</span>
        </div>
      }
    >
      <div className="absolute inset-0 bg-void" />

      {/* the hall, flattened into sepia film like the rest of the house */}
      <div className="absolute inset-0 animate-in fade-in duration-500" style={{ filter: "sepia(.4) contrast(1.06) brightness(.92)" }}>
        <div className="corridor-view">
          <div className="corridor-world" style={world}>
            <div className="cw-plane cw-ceiling" />
            <div className="cw-plane cw-floor">
              <span className="cw-rug" />
              {[100, 330, 560].map((d) => <span key={d} className="cw-pool" style={{ top: `${L - d - 40}cqw` }} />)}
            </div>
            <div className="cw-plane cw-wall cw-left">
              <span className="cw-wainscot" />
              <Frame d={70} img={BG.bgPlayroom} tilt={-3} />
              <SideDoor d={235} />
              <Frame d={420} img={BG.bgDining} tilt={2} />
            </div>
            <div className="cw-plane cw-wall cw-right">
              <span className="cw-wainscot" />
              <Frame d={L - 150} img={BG.bgTitle} tilt={3} />
              <SideDoor d={L - 330} ajar={ajar} />
              <Frame d={L - 500} img={BG.bgHallway} tilt={-2} />
            </div>
            {/* the end of the hall: the door with the room's name on it */}
            <div className="cw-plane cw-end">
              <span className="cw-wainscot" />
              <div className="cw-doorway">
                <img src={dest.room} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: "brightness(1.15) saturate(.9)" }} />
                <span className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 60%, oklch(0.95 0.08 85 / .55), transparent 70%)" }} />
                <div className="cw-door" style={{ transform: open ? "translateZ(0.2cqw) rotateY(-78deg)" : "translateZ(0.2cqw)" }}>
                  <ClosedDoor />
                  <span className="absolute left-1/2 top-[30%] -translate-x-1/2 -rotate-3 whitespace-nowrap bg-paper px-[1.2cqw] py-[0.8cqw] text-[5.5cqw] shadow-[1px_2px_0_oklch(0_0_0/.5)]">
                    <Ransom text={dest.label} seed={chapter * 7} />
                  </span>
                </div>
              </div>
            </div>
            {[100, 330, 560].map((d, i) => (
              <span key={d} className={`cw-lamp ${flicker && i === 1 ? "cw-lamp-flicker" : ""}`} style={{ transform: `translate3d(-50%, 0, -${d}cqw)` }} />
            ))}
          </div>
        </div>
      </div>

      {/* you, a few steps ahead of the camera; at the door you step into the light */}
      <div className="absolute -translate-x-1/2" style={{
        left: open ? "50%" : "32%", bottom: open ? "20%" : "-3%", height: open ? "17%" : "38%",
        opacity: phase === "through" ? 0 : 1,
        transition: open ? `left ${ARRIVE_MS}ms ease-in, bottom ${ARRIVE_MS}ms ease-in, height ${ARRIVE_MS}ms ease-in, opacity ${THROUGH_MS}ms` : undefined,
        aspectRatio: look ? "60 / 140" : "44 / 100",
      }}>
        <div className={`relative h-full w-full origin-bottom ${phase === "through" ? "" : "cut-walk"}`}>
          {look
            ? <ChildDoll look={look} view="back" clothes={`var(--c-${favColor})`} className="relative h-full" />
            : <ChildCutout color={`var(--c-${favColor})`} className="relative h-full" />}
        </div>
      </div>

      {/* the room's light pours through */}
      <div className="pointer-events-none absolute inset-0 transition-opacity" style={{
        background: "radial-gradient(ellipse at 50% 58%, oklch(0.96 0.06 85), oklch(0.85 0.08 75 / .85) 40%, oklch(0.1 0.02 60 / .9))",
        opacity: phase === "through" ? 1 : 0, transitionDuration: `${THROUGH_MS}ms`,
      }} />

      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70" aria-hidden><div className="fx-grain" /></div>
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ boxShadow: "inset 0 0 90px 34px oklch(0.04 0.02 30 / .85)" }} />
    </Shell>
  );
}

/** A family photo hung on a side wall, `d` cqw down the hall. */
function Frame({ d, img, tilt }: { d: number; img: string; tilt: number }) {
  return (
    <span className="cw-frame" style={{ left: `${d}cqw`, rotate: `${tilt}deg` }}>
      <img src={img} alt="" className="h-full w-full object-cover" style={{ filter: "sepia(.6) contrast(1.15)" }} />
    </span>
  );
}

/** A closed door along the hall; the later ones are left ajar, and something is behind them. */
function SideDoor({ d, ajar }: { d: number; ajar?: boolean }) {
  return (
    <span className="cw-sidedoor" style={{ left: `${d}cqw` }}>
      <span className="absolute inset-0 bg-void" />
      {ajar && <span className="dread-glint" style={{ left: "62%", top: "38%" }} />}
      <span className="cw-sidedoor-leaf" style={{ transform: ajar ? "rotateY(-28deg)" : "none" }} />
    </span>
  );
}
