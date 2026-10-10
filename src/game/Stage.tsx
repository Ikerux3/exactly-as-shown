import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGame } from "./store";
import { GuestVoid, LightSwitch } from "./Props";
import { setMuted, setUnease, sfx } from "./audio";
import { GUEST_MIND_LABEL } from "./guest";

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
};

export function Stage({ bg, bgPos = "50% 50%", chapter, children, clues, above, switchEnabled = true, guest }: Props) {
  const s = useGame();
  const frame = useRef<HTMLDivElement>(null);
  const dark = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const darkAcc = useRef(0);
  const lightAcc = useRef(0);

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
      if (!st.interactive || st.scare || st.line || menu) return;
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
  }, [chapter, menu]);

  // Full scare at 100 — once, then restart current phase only.
  useEffect(() => {
    if (s.cordura >= 100 && s.scareArmed && s.interactive && !s.scare) {
      s.set({ scare: true, scareArmed: false });
      sfx("scare");
      window.setTimeout(() => {
        const st = useGame.getState();
        st.set({ scare: false, cordura: 55, lightsOn: true, phaseKey: st.phaseKey + 1, scareArmed: true, line: undefined, queue: [] });
        st.say({ speaker: "narrator", text: "You blink. The room is the way it was a moment ago. Try again.", ms: 3200 });
      }, 1900);
    }
  }, [s.cordura, s.scareArmed, s.interactive, s.scare]);

  // Subtitle auto-advance.
  useEffect(() => {
    if (!s.line) return;
    const ms = s.line.ms ?? Math.max(2200, s.line.text.length * 55);
    const t = window.setTimeout(() => useGame.getState().nextLine(), ms);
    return () => window.clearTimeout(t);
  }, [s.line]);

  const unstable = s.cordura >= 65;
  const toggle = () => {
    sfx("switch");
    s.setLights(!s.lightsOn);
  };

  return (
    <div
      ref={frame}
      className={`game-frame ${unstable ? "unstable" : ""}`}
      onPointerMove={move}
      onPointerDown={move}
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
          background: `radial-gradient(circle at var(--lx, 50%) var(--ly, 55%), oklch(0.2 0.03 80 / 0.05) 0, oklch(0.1 0.03 275 / 0.35) ${LIGHT_R * 0.6}vmin, oklch(0.05 0.02 275 / 0.97) ${LIGHT_R * 1.5}vmin)`,
        }}
      />
      {!s.lightsOn && <div className="pointer-events-none absolute inset-0 z-30">{clues}</div>}

      {s.flicker > 0 && (
        <div key={s.flicker} className="pointer-events-none absolute inset-0 z-30 bg-void" style={{ animation: "flicker 1.2s steps(1) forwards" }} />
      )}

      <div className="absolute inset-0 z-[35] pointer-events-none [&>*]:pointer-events-auto">{above}</div>

      {/* HUD */}
      <div className="absolute left-[3%] right-[3%] top-[2%] z-40 flex items-start justify-between gap-2">
        {s.objective ? (
          s.objectiveOpen ? (
            <button onClick={() => s.set({ objectiveOpen: false })} className="paper max-w-[70%] px-3 py-2 text-left text-sm leading-tight animate-float-up" aria-label="Hide objective">
              <span className="block font-display text-[10px] uppercase tracking-widest opacity-60">Mommy's list</span>
              {s.objective}
            </button>
          ) : (
            <button onClick={() => s.set({ objectiveOpen: true })} className="paper grid h-10 w-10 place-items-center text-lg" aria-label="Show objective">
              ✎
            </button>
          )
        ) : <span />}
        <div className="flex items-center gap-2">
          <div className="paper flex items-center gap-2 px-2 py-1" title="Cordura" aria-label={`Cordura ${s.cordura} of 100`}>
            <span className="font-display text-[10px] uppercase tracking-widest">Cordura</span>
            <div className="h-2 w-14 overflow-hidden rounded-full bg-paper-deep">
              <div className="h-full transition-all duration-700" style={{ width: `${s.cordura}%`, background: s.cordura >= 65 ? "var(--crimson)" : "var(--c-navy)" }} />
            </div>
          </div>
          <button onClick={() => setMenu(true)} className="paper grid h-9 w-9 place-items-center font-display" aria-label="Pause">II</button>
        </div>
      </div>

      {s.line && (
        <button
          onClick={() => s.nextLine()}
          className={`subtitle absolute bottom-[2.5%] left-[4%] right-[24%] z-40 px-4 py-3 text-left text-[15px] leading-snug animate-float-up ${(s.line.speaker === "guest" || s.line.speaker === "mimic") ? "guest" : ""}`}
        >
          {s.line.speaker !== "narrator" && (
            <span className="mb-0.5 block font-hand text-xs uppercase tracking-widest opacity-70">
              {s.line.speaker === "mother" || s.line.speaker === "mimic" ? "Mommy" : s.line.speaker === "guest" ? "…" : "You"}
            </span>
          )}
          {s.line.text}
        </button>
      )}

      {switchEnabled && <LightSwitch on={s.lightsOn} onToggle={toggle} disabled={!s.interactive} />}

      {s.scare && (
        <div className="absolute inset-0 z-50 bg-void" role="alert" aria-label="Something is here">
          <GuestVoid style={{ left: "50%", top: "-5%", height: "115%", transform: "translateX(-50%) scale(1.4)" }} />
        </div>
      )}

      {menu && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-void/70 p-6">
          <div className="paper w-full max-w-xs space-y-4 p-6 text-center">
            <p className="font-display text-xl">Paused</p>
            <button className="stitch-btn sage w-full" onClick={() => { const m = !s.muted; s.set({ muted: m }); setMuted(m); }}>
              {s.muted ? "Sound: off" : "Sound: on"}
            </button>
            <button className="stitch-btn w-full" onClick={() => setMenu(false)}>Back to the house</button>
            <p className="text-xs opacity-70">{GUEST_MIND_LABEL}</p>
          </div>
        </div>
      )}
    </div>
  );
}
