// Ambient dread: small frightening things that happen around the player, never to the game.
// Nothing here touches Cordura, puzzles, hitboxes or the Guest; every layer ignores the pointer.
// It builds slowly: quiet at the start of a room, more often as Cordura and the chapter climb,
// and the visual ones only happen in the dark (the doll mask is only seen if your light finds it).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { create } from "zustand";
import { useGame } from "./store";
import { sfx } from "./audio";

/* ---------- player setting: tape glitches flash, so they can be switched off ---------- */
const FLASH_KEY = "mwbb-flashes-v1";
export function flashesSetting(): boolean {
  try { return localStorage.getItem(FLASH_KEY) !== "off"; } catch { return true; }
}
export function setFlashesSetting(on: boolean) {
  try { localStorage.setItem(FLASH_KEY, on ? "on" : "off"); } catch { /* ignore */ }
}
function flashesAllowed(): boolean {
  if (typeof window === "undefined") return false;
  return flashesSetting() && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Tells the dialogue bar to corrupt its text for a moment. */
export const useDreadSignal = create<{ corrupt: number }>(() => ({ corrupt: 0 }));

/* ---------- the director ---------- */
type Kind = "knock" | "upstairs" | "breath" | "writing" | "crawler" | "peeker" | "glitch" | "corrupt";
/** min: Cordura heat needed (0..1) · cooldown in s · rate: chance per second, scaled by heat. */
const RULES: Record<Kind, { min: number; cooldown: number; rate: number; dark?: boolean; visual?: boolean }> = {
  knock: { min: 0.2, cooldown: 40, rate: 0.025 },
  upstairs: { min: 0.25, cooldown: 45, rate: 0.02 },
  breath: { min: 0.45, cooldown: 35, rate: 0.04, dark: true },
  writing: { min: 0.3, cooldown: 14, rate: 0.07, dark: true, visual: true },
  crawler: { min: 0.35, cooldown: 40, rate: 0.05, dark: true, visual: true },
  peeker: { min: 0.5, cooldown: 45, rate: 0.05, dark: true, visual: true },
  glitch: { min: 0.25, cooldown: 18, rate: 0.03, visual: true },
  corrupt: { min: 0.6, cooldown: 25, rate: 0.05, dark: true },
};
const ORDER = Object.keys(RULES) as Kind[];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

const SCRAWLS = [
  (n: string) => n.toUpperCase(),
  (n: string) => `${n} ${n} ${n}`.toUpperCase(),
  () => "DON'T TURN AROUND",
  () => "mommy isn't coming",
  () => "it's under the bed",
  () => "let me in",
  () => "WE SEE YOU",
  () => "lights off. lights off.",
  () => "you left the door open",
  (n: string) => `play with us ${n.toLowerCase()}`,
];
/** Centres of bare wall areas (frame %): high up, away from the wall arrows and the bottom panels. */
const WALL_SPOTS: Array<[number, number]> = [[34, 14], [64, 13], [50, 24], [62, 32], [36, 38], [52, 44]];

type Writing = { id: number; text: string; x: number; y: number; rot: number; size: number };
type Crawler = { id: number; y: number; ltr: boolean; ms: number };
type Peeker = { id: number; left: boolean; y: number; state: "enter" | "in" | "caught" | "out" };
type Glitch = { id: number; slices: Array<{ top: number; h: number; dx: number; hue: number }> };

export function Dread({ chapter, bg, bgPos, lit }: {
  chapter: number;
  bg: string;
  bgPos: string;
  /** Stage's flashlight test (frame %). */
  lit: (x: number, y: number, extra?: number) => boolean;
}) {
  const lightsOn = useGame((s) => s.lightsOn);
  const [writing, setWriting] = useState<Writing | null>(null);
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [peeker, setPeeker] = useState<Peeker | null>(null);
  const [glitch, setGlitch] = useState<Glitch | null>(null);
  const last = useRef<Partial<Record<Kind | "visual", number>>>({});
  const born = useRef(Date.now());
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const fire = (k: Kind) => {
    const now = Date.now();
    last.current[k] = now;
    if (RULES[k].visual) last.current.visual = now;
    const id = now;
    switch (k) {
      case "knock": sfx("knock"); break;
      case "upstairs": sfx("upstairs"); break;
      case "breath": sfx("breath"); break;
      case "writing": {
        const name = useGame.getState().name || "little one";
        const [x, y] = pick(WALL_SPOTS);
        setWriting({ id, text: pick(SCRAWLS)(name), x, y, rot: (Math.random() - 0.5) * 18, size: 5.5 + Math.random() * 2.5 });
        later(() => setWriting((w) => (w?.id === id ? null : w)), 5200);
        break;
      }
      case "crawler": {
        const ms = 3400 + Math.random() * 1200;
        setCrawler({ id, y: 1 + Math.random() * 7, ltr: Math.random() > 0.5, ms });
        sfx("skitter");
        later(() => sfx("skitter"), ms * 0.5);
        later(() => setCrawler((c) => (c?.id === id ? null : c)), ms + 100);
        break;
      }
      case "peeker": {
        setPeeker({ id, left: Math.random() > 0.5, y: 28 + Math.random() * 20, state: "enter" });
        later(() => setPeeker((p) => (p?.id === id && p.state === "enter" ? { ...p, state: "in" } : p)), 40);
        // Not found in time: it slips back out on its own.
        later(() => setPeeker((p) => (p?.id === id && p.state === "in" ? { ...p, state: "out" } : p)), 7000);
        later(() => setPeeker((p) => (p?.id === id ? null : p)), 8200);
        break;
      }
      case "glitch": {
        if (!flashesAllowed()) { sfx("static"); break; }
        setGlitch({
          id,
          slices: Array.from({ length: 3 }, () => ({ top: Math.random() * 85, h: 3 + Math.random() * 9, dx: (Math.random() - 0.5) * 14, hue: Math.random() > 0.5 ? 45 : -70 })),
        });
        sfx("static");
        later(() => setGlitch((g) => (g?.id === id ? null : g)), 650);
        break;
      }
      case "corrupt": useDreadSignal.setState({ corrupt: now }); sfx("static"); break;
    }
  };

  // QA: in dev builds, `__dread("peeker")` etc. fires an event right away.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __dread?: (k: Kind) => void };
    w.__dread = fire;
    return () => { delete w.__dread; };
  });

  // The director ticks once a second and allows at most one event per tick.
  useEffect(() => {
    born.current = Date.now();
    const id = window.setInterval(() => {
      const st = useGame.getState();
      if (st.paused || st.scare || !st.interactive) return;
      const now = Date.now();
      if (now - born.current < 6000) return; // every room gets a quiet moment first
      const heat = Math.min(1.2, st.cordura / 100 + (chapter - 1) * 0.05);
      for (const k of ORDER) {
        const r = RULES[k];
        if (heat < r.min || (r.dark && st.lightsOn)) continue;
        if (now - (last.current[k] ?? 0) < r.cooldown * 1000) continue;
        if (r.visual && now - (last.current.visual ?? 0) < 5000) continue;
        if (Math.random() < r.rate * heat) { fire(k); break; }
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);

  // Switching the light off is when the house answers: sometimes the tape skips, and the first
  // time it's dark enough, something has been written on the wall.
  const wasOn = useRef(lightsOn);
  useEffect(() => {
    const turnedOff = wasOn.current && !lightsOn;
    wasOn.current = lightsOn;
    if (lightsOn) { setWriting(null); setCrawler(null); setPeeker((p) => (p ? { ...p, state: "out" } : p)); return; }
    if (!turnedOff) return;
    const st = useGame.getState();
    if (!st.interactive || st.scare) return;
    const heat = st.cordura / 100 + (chapter - 1) * 0.05;
    const now = Date.now();
    if (heat >= 0.25 && now - (last.current.glitch ?? 0) > 12000 && Math.random() < 0.3) later(() => fire("glitch"), 120);
    if (heat >= 0.3 && !last.current.writing) later(() => { if (!useGame.getState().lightsOn) fire("writing"); }, 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightsOn]);

  // The doll mask only exists until your light lands on it.
  useEffect(() => {
    if (!peeker || peeker.state !== "in") return;
    const fx = peeker.left ? 9 : 91;
    const fy = peeker.y + 10;
    let litMs = 0;
    const id = window.setInterval(() => {
      if (useGame.getState().lightsOn) return;
      litMs = lit(fx, fy, 3) ? litMs + 100 : 0;
      if (litMs >= 200) {
        sfx("sting");
        setPeeker((p) => (p && p.id === peeker.id ? { ...p, state: "caught" } : p));
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [peeker, lit]);

  return (
    <>
      {crawler && <CeilingCrawler key={crawler.id} c={crawler} />}
      {peeker && <DollMask key={peeker.id} p={peeker} />}
      {writing && !lightsOn && (
        <p key={writing.id} className="dread-scrawl" aria-hidden
          style={{ left: `${writing.x}%`, top: `${writing.y}%`, rotate: `${writing.rot}deg`, fontSize: `${writing.size}cqw` }}>
          {writing.text}
        </p>
      )}
      {glitch && <TapeGlitch key={glitch.id} g={glitch} bg={bg} bgPos={bgPos} />}
    </>
  );
}

/* ---------- the thing on the ceiling: long legs, a cone for a head, stop-motion steps ---------- */
function CeilingCrawler({ c }: { c: Crawler }) {
  // The wrapper only moves `left` (no transform), so its two layers can sit on either side of
  // the darkness: the body below it (only your light shows it), the eye glints above it.
  const style = {
    top: `${c.y}%`,
    ["--from" as string]: c.ltr ? "-40%" : "105%",
    ["--to" as string]: c.ltr ? "105%" : "-40%",
    animationDuration: `${c.ms}ms`,
  } as CSSProperties;
  const flip = `scale(${c.ltr ? 1 : -1}, -1)`; // walking upside down along the ceiling
  return (
    <div className="dread-crawler" style={style} aria-hidden>
      <svg viewBox="0 0 160 100" className="absolute inset-0 z-[15] h-full w-full overflow-visible" style={{ transform: flip, filter: "drop-shadow(2px 3px 0 oklch(0 0 0 / .5))" }}>
        <g stroke="oklch(0.06 0.01 270)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <g className="gait-a">
            <path d="M50 34 L34 6 L18 96" /><path d="M64 36 L58 2 L54 96" /><path d="M78 36 L86 4 L96 96" /><path d="M92 34 L108 8 L124 96" />
          </g>
          <g className="gait-b">
            <path d="M50 34 L40 4 L30 96" /><path d="M64 36 L52 6 L44 96" /><path d="M78 36 L92 2 L106 96" /><path d="M92 34 L100 10 L112 96" />
          </g>
        </g>
        <path d="M38 34 C50 22 92 24 106 32 C94 42 52 44 38 34 Z" fill="oklch(0.08 0.01 270)" stroke="oklch(0.85 0.03 85 / .7)" strokeWidth="1.2" />
        <path d="M104 33 L114 42" stroke="oklch(0.08 0.01 270)" strokeWidth="3" />
        <path d="M112 41 L150 4 L126 50 Z" fill="oklch(0.08 0.01 270)" stroke="oklch(0.85 0.03 85 / .7)" strokeWidth="1.2" />
        <ellipse cx="119" cy="47" rx="7" ry="6" fill="oklch(0.8 0.02 80)" />
        <circle cx="116.5" cy="46" r="1.6" fill="oklch(0.08 0.01 270)" />
        <circle cx="121.5" cy="46.5" r="1.6" fill="oklch(0.08 0.01 270)" />
      </svg>
      {/* two pinpricks of light where its face is, visible even in the dark */}
      <span className="dread-glint z-[31]" style={{ left: `${c.ltr ? 74 : 26}%`, top: "53%" }} />
    </div>
  );
}

/* ---------- the doll mask: pale paper face, hollow eyes, black yarn hair, a long neck ---------- */
function DollMask({ p }: { p: Peeker }) {
  const hidden = p.state === "enter" || p.state === "caught" || p.state === "out";
  const off = p.left ? "-125%" : "125%";
  return (
    <div aria-hidden className="pointer-events-none absolute z-[16] w-[24%]"
      style={{
        top: `${p.y}%`,
        [p.left ? "left" : "right"]: "-3%",
        aspectRatio: "100 / 170",
        translate: hidden ? `${off} 0` : "0 0",
        rotate: `${p.left ? 16 : -16}deg`,
        transition: `translate ${p.state === "caught" ? 110 : p.state === "out" ? 900 : 1700}ms ${p.state === "in" ? "cubic-bezier(.2,.7,.2,1)" : "ease-in"}`,
      }}>
      <svg viewBox="0 0 100 170" className="h-full w-full overflow-visible" style={{ filter: "drop-shadow(4px 5px 0 oklch(0 0 0 / .5))" }}>
        <path d="M43 112 L40 170 L60 170 L57 112 Z" fill="oklch(0.07 0.01 270)" />
        <g fill="none" stroke="oklch(0.07 0.01 270)" strokeWidth="3.2" strokeLinecap="round">
          <path d="M50 8 C20 4 6 40 12 78 C14 96 8 112 16 128" /><path d="M50 8 C80 4 94 40 88 78 C86 96 92 112 84 128" />
          <path d="M30 14 C10 40 22 70 6 96" /><path d="M70 14 C90 40 78 70 94 96" /><path d="M40 10 C18 30 26 60 18 110" /><path d="M60 10 C82 30 74 60 82 110" />
        </g>
        <path d="M50 14 C70 14 79 36 78 62 C77 92 65 114 50 114 C35 114 23 92 22 62 C21 36 30 14 50 14 Z" fill="oklch(0.88 0.02 80)" stroke="oklch(0.95 0.02 85)" strokeWidth="1.5" />
        <circle cx="34" cy="76" r="5" fill="oklch(0.62 0.12 20 / .35)" />
        <circle cx="66" cy="76" r="5" fill="oklch(0.62 0.12 20 / .35)" />
        <ellipse cx="39" cy="56" rx="5.5" ry="8.5" fill="oklch(0.07 0.01 270)" />
        <ellipse cx="61" cy="56" rx="5.5" ry="8.5" fill="oklch(0.07 0.01 270)" />
        <circle cx="40.5" cy="58" r="1.2" fill="oklch(0.95 0.01 85)" />
        <circle cx="59.5" cy="58" r="1.2" fill="oklch(0.95 0.01 85)" />
        <path d="M50 58 L46 80 L54 80" fill="none" stroke="oklch(0.5 0.04 40)" strokeWidth="1.6" strokeLinejoin="round" />
        <ellipse cx="50" cy="95" rx="9" ry="5.5" fill="oklch(0.12 0.03 20)" stroke="oklch(0.45 0.12 22)" strokeWidth="1.5" />
        <g fill="none" stroke="oklch(0.07 0.01 270)" strokeWidth="2.6" strokeLinecap="round">
          <path d="M44 14 C30 30 30 46 24 60" /><path d="M56 14 C70 30 70 46 76 60" />
        </g>
      </svg>
    </div>
  );
}

/* ---------- a skipping tape: torn horizontal slices of the room, a VCR read-out ---------- */
function TapeGlitch({ g, bg, bgPos }: { g: Glitch; bg: string; bgPos: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden" aria-hidden>
      {g.slices.map((s, i) => (
        <div key={i} className="absolute inset-x-0 overflow-hidden" style={{ top: `${s.top}%`, height: `${s.h}%`, animation: "tape-slice 0.3s steps(3) forwards" }}>
          <div className="absolute inset-x-0" style={{ top: `${(-s.top * 100) / s.h}%`, height: `${10000 / s.h}%`, translate: `${s.dx}% 0` }}>
            <img src={bg} alt="" className="scene-bg" style={{ objectPosition: bgPos, filter: `sepia(.3) hue-rotate(${s.hue}deg) saturate(2.2) contrast(1.45) brightness(1.15)` }} />
          </div>
        </div>
      ))}
      <div className="tape-scanlines absolute inset-0" />
      <p className="tape-osd left-[4%] top-[3%]">▶ PLAY</p>
      <p className="tape-osd bottom-[3%] right-[4%]">SAT OCT 10 1987 · 21:{String(13 + (g.id % 40)).padStart(2, "0")}</p>
    </div>
  );
}

/* ---------- title screen: someone is up at the window ---------- */
export function WindowWatcher({ left, top }: { left: string; top: string }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    let t = 0;
    const loop = (first: boolean) => {
      t = window.setTimeout(() => { setK((x) => x + 1); loop(false); }, first ? 6000 : 10000 + Math.random() * 7000);
    };
    loop(true);
    return () => window.clearTimeout(t);
  }, []);
  if (!k) return null;
  return (
    <div key={k} aria-hidden className="window-watcher pointer-events-none absolute flex -translate-x-1/2 gap-[0.9cqw]" style={{ left, top }}>
      <i /><i />
    </div>
  );
}
