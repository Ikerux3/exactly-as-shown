import { useEffect, useRef, type ReactNode } from "react";
import { useGame } from "./store";
import { GuestVoid, LightSwitch } from "./Props";
import { setUnease, sfx } from "./audio";
import { ChapterCard } from "./kit";
import { ChapterBar, DialogueBar, PauseMenu, Shell, usePauseKey } from "./Shell";

// Shared flashlight position (percent of frame) so scenes can test illumination.
export const light = { x: 50, y: 55 };
export const LIGHT_R = 17; // percent of frame width

export function illuminated(x: number, y: number, extra = 0) {
  const dx = x - light.x;
  const dy = (y - light.y) * 1.5; // frame is 2:3
  return Math.hypot(dx, dy) < LIGHT_R + extra;
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
};

export function Stage({ bg, bgPos = "50% 50%", chapter, children, clues, above, switchEnabled = true, guest, progress, chapterCard }: Props) {
  const s = useGame();
  const frame = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const darkAcc = useRef(0);
  const lightAcc = useRef(0);
  usePauseKey(true);

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
      setUnease(st.cordura, chapter);
      if (!st.interactive || st.scare || st.line || st.paused) return;
      if (!st.lightsOn) {
        darkAcc.current += 1;
        st.fact({ darkSeconds: st.facts.darkSeconds + 1 });
        if (darkAcc.current >= 2) { darkAcc.current = 0; st.addCordura(1); }
      } else {
        lightAcc.current += 1;
        if (lightAcc.current >= 3) { lightAcc.current = 0; st.addCordura(-1); }
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
        st.set({ scare: false, cordura: 55, lightsOn: true, phaseKey: st.phaseKey + 1, scareArmed: true, line: undefined, queue: [] });
        st.say({ speaker: "narrator", text: "You blink. The room is the way it was a moment ago. Try again.", ms: 3200 });
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
      frameClassName={unstable ? "unstable" : ""}
      onFramePointer={move}
      top={<ChapterBar chapter={chapter} progress={progress} />}
      bottom={
        <DialogueBar
          right={switchEnabled ? <LightSwitch on={s.lightsOn} onToggle={toggle} disabled={!s.interactive || s.scare} /> : null}
        />
      }
      overlay={
        <>
          {s.scare && (
            <div className="absolute inset-0 z-50 overflow-hidden bg-void" role="alert" aria-label="Something is here">
              <GuestVoid style={{ left: "50%", top: "-5%", height: "115%", transform: "translateX(-50%) scale(1.4)" }} />
            </div>
          )}
          {s.paused && !s.scare && <PauseMenu />}
        </>
      }
    >
      <img src={bg} alt="" className="scene-bg" style={{ objectPosition: bgPos, filter: s.lightsOn ? undefined : "saturate(0.3) brightness(0.7) hue-rotate(-20deg)" }} />
      {/* warm lamp tint */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, oklch(0.85 0.1 80 / 0.12), transparent 70%)" }} />

      {/* Shadow pass intervention */}
      {s.shadowPass > 0 && (
        <div key={s.shadowPass} className="pointer-events-none absolute inset-y-0 z-10 w-1/3" style={{ background: "linear-gradient(90deg, transparent, oklch(0.05 0.01 270 / .55), transparent)", animation: "drift 2.6s ease-in forwards" }} />
      )}

      <div className="absolute inset-0 z-10">{children}</div>

      {guest?.show && !s.lightsOn && (
        <GuestVoid style={{ left: `${guest.x}%`, top: `${guest.y}%`, height: `${guest.h}%`, transform: "translate(-50%, 0)", zIndex: 25 }} intensity={0.95} />
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
      {!s.lightsOn && <div className="pointer-events-none absolute inset-0 z-30">{clues}</div>}

      {s.flicker > 0 && (
        <div key={s.flicker} className="pointer-events-none absolute inset-0 z-30 bg-void" style={{ animation: "flicker 1.2s steps(1) forwards" }} />
      )}

      <div className="pointer-events-none absolute inset-0 z-[35] [&>*]:pointer-events-auto">{above}</div>

      {chapterCard && <ChapterCard n={chapter} />}
    </Shell>
  );
}
