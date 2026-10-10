import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { WALLS } from "./assets";
import { useGame } from "./store";
import { GuestVoid, LightSwitch } from "./Props";
import { setUnease, sfx } from "./audio";
import { ChapterCard } from "./kit";
import { GAMEPLAY_RULES, checkpointScreen } from "./gameplayRules";
import { ChapterBar, DialogueBar, PauseMenu, Shell, usePauseKey } from "./Shell";
import { CutoutDefs, SanityFX } from "./fx";
import { Dread } from "./dread";

// Shared flashlight position (percent of frame) so scenes can test illumination.
export const light = { x: 50, y: 55 };
export const LIGHT_R = 17; // percent of frame width

export function illuminated(x: number, y: number, extra = 0) {
  const dx = x - light.x;
  const dy = (y - light.y) * 1.5; // frame is 2:3
  return Math.hypot(dx, dy) < LIGHT_R + extra;
}

/* ---- Four walls: the room is a diorama you turn by swiping ---- */
const WallCtx = createContext(0);
export const useWall = () => useContext(WallCtx);
const WALL_NAME = ["Front", "Right", "Back", "Left"];
/** Render children only while the player faces wall n (0 front, 1 right, 2 back, 3 left). */
export function OnWall({ n, children }: { n: number; children: ReactNode }) {
  return useWall() === n ? <>{children}</> : null;
}

type Props = {
  bg: string;
  bgPos?: string;
  chapter: number;
  children: ReactNode;
  clues?: ReactNode; // only visible in darkness, glows above it
  above?: ReactNode; // UI that sits above darkness regardless (panels)
  switchEnabled?: boolean;
  guest?: { x: number; y: number; h: number; show: boolean };
  /** Short progress readout for the HUD, e.g. "Toys 3/5". */
  progress?: string | undefined;
  /** Show the "Chapter N" title card when the scene opens. */
  chapterCard?: boolean;
  /** Make the light switch glow when the next step is to use it. */
  switchHint?: boolean;
  /** Scene places its own props per wall with <OnWall>. Otherwise everything lives on the front wall. */
  spread?: boolean;
};

export function Stage({
  bg,
  bgPos = "50% 50%",
  chapter,
  children,
  clues,
  above,
  switchEnabled = true,
  guest,
  progress,
  chapterCard,
  switchHint,
  spread,
}: Props) {
  const s = useGame();
  const frame = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const darkAcc = useRef(0);
  const lightAcc = useRef(0);
  usePauseKey(true);

  const walls = WALLS[bg];
  const [wall, setWall] = useState(0);
  const [dir, setDir] = useState(0);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const turn = (d: number) => {
    if (!walls) return;
    const st = useGame.getState();
    if (st.scare || st.paused) return;
    setDir(d);
    setWall((w) => (w + d + 4) % 4);
    sfx("creak");
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") turn(-1);
      if (e.key === "ArrowRight") turn(1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const shownBg = walls ? walls[wall]! : bg;
  const shownPos = wall === 0 ? bgPos : "50% 50%";

  // Flashlight follows finger / mouse.
  const move = (e: React.PointerEvent) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    light.x = ((e.clientX - r.left) / r.width) * 100;
    light.y = ((e.clientY - r.top) / r.height) * 100;
    dark.current?.style.setProperty("--lx", `${light.x}%`);
    dark.current?.style.setProperty("--ly", `${light.y}%`);
  };

  // Cordura ticker.
  useEffect(() => {
    const id = window.setInterval(() => {
      const st = useGame.getState();
      // Music is visibly/audibly more corrupt when the music-box room is dark.
      setUnease(Math.min(100, st.cordura + (chapter === 3 && !st.lightsOn ? 40 : 0)), chapter);
      if (!st.interactive || st.scare || st.line || st.paused || st.forcedBlackout) return;
      if (!st.lightsOn) {
        darkAcc.current += 1;
        st.fact({ darkSeconds: st.facts.darkSeconds + 1 });
        lightAcc.current = 0;
        st.addCordura(GAMEPLAY_RULES.darkPerSecond);
      } else {
        lightAcc.current += 1;
        if (lightAcc.current >= GAMEPLAY_RULES.litSecondsPerPoint) {
          lightAcc.current = 0;
          st.addCordura(-1);
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [chapter]);

  // Full scare at 100 — once, then restart current phase only.
  useEffect(() => {
    if (s.cordura >= 100 && s.scareArmed && s.interactive && !s.scare) {
      s.set({ scare: true, scareArmed: false, paused: false });
      sfx("scare");
      window.setTimeout(() => {
        const st = useGame.getState();
        const checkpoint = checkpointScreen(st.screen);
        st.set({
          screen: checkpoint,
          scare: false,
          forcedBlackout: false,
          cordura: GAMEPLAY_RULES.retryCordura,
          lightsOn: true,
          phaseKey: st.phaseKey + 1,
          scareArmed: true,
          line: undefined,
          queue: [],
          interactive: false,
          ...(checkpoint === "ch1" ? { ch1: [] } : {}),
          ...(checkpoint === "ch2k" ? { ch2Items: [], ch2Placed: [] } : {}),
          ...(checkpoint === "ch3" ? { ch3Rounds: 0 } : {}),
        });
        lightAcc.current = 0;
        useGame.getState().go(checkpoint); // writes the level-start checkpoint into the save
        st.say({
          speaker: "narrator",
          text: "You blink. The room is the way it was a moment ago. Try again.",
          ms: 3200,
        });
      }, 1900);
    }
  }, [s.cordura, s.scareArmed, s.interactive, s.scare]);

  const unstable = s.cordura >= 65;
  const toggle = () => {
    sfx("switch");
    s.setLights(!s.lightsOn);
  };

  return (
    <Shell
      frameRef={frame}
      frameClassName={`${unstable ? "unstable" : ""} ${s.lightsOn ? "" : "lights-off"} ${s.cordura >= 50 ? "warp" : ""}`}
      onFramePointer={move}
      onFrameDown={(e: React.PointerEvent) => {
        // Don't turn walls when the player is tapping or dragging an actual control.
        const target = e.target as Element;
        if (target.closest("button, input, textarea, select, [role='button']")) {
          swipe.current = null;
          return;
        }
        swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      }}
      onFrameUp={(e: React.PointerEvent) => {
        const s0 = swipe.current;
        swipe.current = null;
        if (!s0 || !walls) return;
        const dx = e.clientX - s0.x;
        const dy = e.clientY - s0.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - s0.t < 700) turn(dx < 0 ? 1 : -1);
      }}
      top={<ChapterBar chapter={chapter} progress={progress} />}
      bottom={
        <DialogueBar
          right={
            switchEnabled ? (
              <LightSwitch
                on={s.lightsOn}
                onToggle={toggle}
                disabled={!s.interactive || s.scare || s.forcedBlackout}
                hint={switchHint && !s.line}
              />
            ) : null
          }
        />
      }
      overlay={
        <>
          {s.scare && (
            <div
              className="absolute inset-0 z-50 overflow-hidden bg-void"
              role="alert"
              aria-label="Something is here"
            >
              <GuestVoid
                style={{
                  left: "50%",
                  top: "-5%",
                  height: "115%",
                  transform: "translateX(-50%) scale(1.4)",
                }}
              />
            </div>
          )}
          {s.paused && !s.scare && <PauseMenu />}
        </>
      }
    >
      <WallCtx.Provider value={wall}>
      <img
        key={wall}
        src={shownBg}
        alt=""
        className={`scene-bg ${dir > 0 ? "wall-in-r" : dir < 0 ? "wall-in-l" : ""}`}
        style={{
          objectPosition: shownPos,
          filter: s.lightsOn ? undefined : "saturate(0.3) brightness(0.7) hue-rotate(-20deg)",
        }}
      />
      {/* warm lamp tint */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, oklch(0.85 0.1 80 / 0.12), transparent 70%)",
        }}
      />

      {/* Shadow pass intervention */}
      {s.shadowPass > 0 && (
        <div
          key={s.shadowPass}
          className="pointer-events-none absolute inset-y-0 z-10 w-1/3"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.05 0.01 270 / .55), transparent)",
            animation: "drift 2.6s ease-in forwards",
          }}
        />
      )}

      <div key={`w${wall}`} className={`absolute inset-0 z-10 ${dir > 0 ? "wall-in-r" : dir < 0 ? "wall-in-l" : ""}`}>{spread || wall === 0 ? children : null}</div>
      <CutoutDefs />
      <SanityFX bg={shownBg} bgPos={shownPos} />
      <Dread chapter={chapter} bg={shownBg} bgPos={shownPos} lit={illuminated} />

      {guest?.show && !s.lightsOn && (
        <GuestVoid
          style={{
            left: `${guest.x}%`,
            top: `${guest.y}%`,
            height: `${guest.h}%`,
            transform: "translate(-50%, 0)",
            zIndex: 25,
          }}
          intensity={0.95}
        />
      )}

      {/* Darkness with a small hand-held light */}
      <div
        ref={dark}
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-500"
        style={{
          opacity: s.lightsOn ? 0 : 1,
          background: `radial-gradient(circle at var(--lx, 50%) var(--ly, 55%), oklch(0.2 0.03 80 / 0.05) 0, oklch(0.1 0.03 275 / 0.35) ${LIGHT_R * 0.6}cqw, oklch(0.05 0.02 275 / 0.97) ${LIGHT_R * 1.5}cqw)`,
        }}
      />
      {!s.lightsOn && <div className="pointer-events-none absolute inset-0 z-30">{spread || wall === 0 ? clues : null}</div>}

      {s.flicker > 0 && (
        <div
          key={s.flicker}
          className="pointer-events-none absolute inset-0 z-30 bg-void"
          style={{ animation: "flicker 1.2s steps(1) forwards" }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-[35] [&>*]:pointer-events-auto">
        {above}
      </div>

      {walls && !s.scare && (
        <>
          <button aria-label="Turn to the left wall" onClick={() => turn(-1)} className="wall-arrow left-1">‹</button>
          <button aria-label="Turn to the right wall" onClick={() => turn(1)} className="wall-arrow right-1">›</button>
          <div aria-live="polite" className="pointer-events-none absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-1.5 rotate-[-2deg] bg-paper px-2 py-0.5 font-display text-[11px] uppercase tracking-widest text-ink shadow-[2px_3px_0_oklch(0_0_0/.5)]">
            {WALL_NAME.map((n, i) => <span key={n} className={`h-2 w-2 ${i === wall ? "bg-ink" : "border border-ink/50"}`} />)}
            <span className="ml-1">{WALL_NAME[wall]}</span>
          </div>
        </>
      )}
      </WallCtx.Provider>

      {chapterCard && <ChapterCard n={chapter} />}
    </Shell>
  );
}
