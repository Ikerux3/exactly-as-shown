import { useEffect, useMemo, useRef, useState } from "react";
import { BG, CUT, SCARE, TOY_IMG } from "./assets";
import { useGame, type Screen, type ToyId } from "./store";
import { resetOnce } from "./kit";
import { startMusic, unlockAudio, sfx } from "./audio";

/* ---------- Ransom-note text: every letter cut from a different page ---------- */
const FONTS = ['"Abril Fatface", serif', '"Special Elite", monospace', '"Rubik Mono One", sans-serif', '"Playfair Display", serif', '"Bowlby One", sans-serif', '"Caveat Brush", cursive'];
const PAPERS = [
  ["oklch(0.94 0.03 85)", "oklch(0.2 0.02 50)"],
  ["oklch(0.15 0.01 270)", "oklch(0.93 0.02 85)"],
  ["oklch(0.45 0.15 22)", "oklch(0.95 0.02 85)"],
  ["oklch(0.86 0.08 90)", "oklch(0.2 0.02 50)"],
  ["oklch(0.97 0 0)", "oklch(0.45 0.15 22)"],
  ["oklch(0.7 0.06 140)", "oklch(0.15 0.01 270)"],
] as const;

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function Ransom({ text, seed = 1, className = "" }: { text: string; seed?: number; className?: string }) {
  // Letters are grouped per word so a line only ever wraps between words, never mid-word.
  const words: Array<{ start: number; chars: string[] }> = [];
  let pos = 0;
  for (const word of text.split(" ")) {
    words.push({ start: pos, chars: [...word] });
    pos += [...word].length + 1;
  }
  return (
    <span className={`ransom ${className}`} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="ransom-word">
          {w.chars.map((ch, ci) => <RansomLetter key={ci} ch={ch} i={w.start + ci} seed={seed} />)}
        </span>
      ))}
    </span>
  );
}

function RansomLetter({ ch, i, seed }: { ch: string; i: number; seed: number }) {
  const r = (k: number) => rand(seed * 31 + i * 7 + k);
  const p = PAPERS[Math.floor(r(1) * PAPERS.length)]!;
  const rotation = ((r(3) - 0.5) * 14).toFixed(3);
  const offset = ((r(4) - 0.5) * 0.12).toFixed(3);
  const size = (0.85 + r(5) * 0.35).toFixed(3);
  return (
    <span aria-hidden className="ransom-l" style={{
      fontFamily: FONTS[Math.floor(r(2) * FONTS.length)],
      backgroundColor: p[0], color: p[1],
      transform: `rotate(${rotation}deg) translateY(${offset}em)`,
      fontSize: `${size}em`,
      textTransform: r(6) > 0.5 ? "uppercase" : "lowercase",
    }}>{ch}</span>
  );
}

/* ---------- Sanity overlay: vignette, chromatic split, grain, eyes, heartbeat ---------- */
export function SanityFX({ bg, bgPos }: { bg: string; bgPos: string }) {
  const c = useGame((s) => s.cordura);
  const t = c / 100;
  const split = c >= 45 ? (c - 45) / 55 : 0;
  return (
    <>
      {split > 0 && (
        <div className="fx-aberr z-[11]" style={{ opacity: split * 0.35 }} aria-hidden>
          <img src={bg} alt="" style={{ objectPosition: bgPos, filter: "sepia(1) saturate(6) hue-rotate(-40deg)", transform: `translateX(${split * 5}px)` }} />
          <img src={bg} alt="" style={{ objectPosition: bgPos, filter: "sepia(1) saturate(6) hue-rotate(150deg)", transform: `translateX(${-split * 5}px)` }} />
        </div>
      )}
      <div className={`fx-vignette z-[21] ${c >= 80 ? "fx-pulse" : ""}`} aria-hidden
        style={{ boxShadow: `inset 0 0 ${40 + t * 120}px ${t * 60}px oklch(0.06 0.03 20 / ${0.25 + t * 0.6})` }} />
      <div className="pointer-events-none absolute inset-0 z-[22] overflow-hidden" aria-hidden style={{ opacity: 0.4 + t * 0.6 }}>
        <div className="fx-grain" />
      </div>
      <ShadowHands c={c} />
      {c >= 85 && <FaceFlash />}
      <Walkers />
    </>
  );
}

/* Little toy silhouettes that scurry across the floor in the dark. */
function Walkers() {
  const c = useGame((s) => s.cordura);
  const dark = !useGame((s) => s.lightsOn);
  const [w, setW] = useState<{ id: number; toy: ToyId; y: number; ltr: boolean; dur: number }[]>([]);
  const id = useRef(0);
  useEffect(() => {
    if (!dark || c < 30) return;
    const every = c >= 75 ? 2200 : c >= 50 ? 4200 : 7000;
    const t = window.setInterval(() => {
      const toys: ToyId[] = ["bear", "rabbit", "train", "doll", "elephant"];
      const n = { id: ++id.current, toy: toys[Math.floor(Math.random() * 5)]!, y: 68 + Math.random() * 20, ltr: Math.random() > 0.5, dur: 1.8 + Math.random() * 1.6 };
      setW((a) => [...a.slice(-3), n]);
      sfx("creak");
    }, every);
    return () => window.clearInterval(t);
  }, [dark, c >= 30, c >= 50, c >= 75]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dark) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[23] overflow-hidden" aria-hidden>
      {w.map((x) => (
        <img key={x.id} src={TOY_IMG[x.toy]} alt="" className="walker w-[9%]"
          style={{ top: `${x.y}%`, ["--from" as string]: x.ltr ? "-12%" : "105%", ["--to" as string]: x.ltr ? "105%" : "-12%", animationDuration: `${x.dur}s, .35s`, scale: x.ltr ? "1 1" : "-1 1" }} />
      ))}
    </div>
  );
}

/* ---------- Scene transitions: blackout + photo-montage snaps ---------- */
const SNAPS = Object.values(BG);
export function TransitionVeil({ screen }: { screen: Screen }) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  const picks = useMemo(() => [0, 1, 2].map(() => SNAPS[Math.floor(Math.random() * SNAPS.length)]!), [screen]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setOn(true);
    sfx("switch");
    const t = window.setTimeout(() => setOn(false), 1400);
    return () => window.clearTimeout(t);
  }, [screen]);
  if (!on) return null;
  return (
    <div key={screen} className="pointer-events-none fixed inset-0 z-[100] bg-void" style={{ animation: "veil 1.4s ease forwards" }} aria-hidden>
      {picks.map((src, i) => (
        <img key={i} src={src} alt="" className="absolute object-cover"
          style={{
            left: `${15 + i * 22}%`, top: `${20 + (i % 2) * 25}%`, width: "34%", aspectRatio: "3/4",
            filter: "grayscale(1) contrast(1.8) brightness(0.8)", border: "6px solid var(--paper)", borderBottomWidth: 22,
            transform: `rotate(${(i - 1) * 9}deg)`, opacity: 0,
            animation: `snap 0.32s steps(1) ${0.15 + i * 0.22}s forwards`,
          }} />
      ))}
    </div>
  );
}

/* ---------- Dev shortcut: hold 1–5 to jump to a chapter ---------- */
const JUMP: Record<string, Screen> = { "1": "ch1", "3": "ch3", "4": "ch4", "5": "ch5" };
export const HOLD_MS = 2000;
export function useChapterJump() {
  const [holding, setHolding] = useState<string | null>(null);
  useEffect(() => {
    let timer = 0;
    let key: string | null = null;
    const down = (e: KeyboardEvent) => {
      if (e.repeat || !JUMP[e.key] || (e.target as HTMLElement)?.tagName === "INPUT") return;
      key = e.key; setHolding(e.key);
      const destination = JUMP[e.key];
      if (!destination) return;
      timer = window.setTimeout(() => {
        const s = useGame.getState();
        unlockAudio(); resetOnce();
        s.newRun();
        s.set({ name: "Lucía", cordura: 20 });
        startMusic();
        s.go(destination);
        setHolding(null);
      }, HOLD_MS);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      window.clearTimeout(timer); key = null; setHolding(null);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.clearTimeout(timer); };
  }, []);
  return holding;
}

/* Shared SVG filters: torn-paper edge for every prop, and a sanity "warp" (Don't Starve-style wobble). */
export function CutoutDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="torn" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="5" />
      </filter>
      <filter id="warp">
        <feTurbulence type="turbulence" baseFrequency="0.012 0.03" numOctaves="1" seed="2">
          <animate attributeName="baseFrequency" values="0.012 0.03;0.016 0.022;0.012 0.03" dur="6s" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="9" />
      </filter>
    </svg>
  );
}

/* Black paper hands creep in from the edges as cordura climbs; light pushes them back. */
function ShadowHands({ c }: { c: number }) {
  if (c < 50) return null;
  const reach = Math.min(1, (c - 50) / 45);
  const hands = [
    { side: "left", top: 22, flip: false }, { side: "right", top: 58, flip: true },
    { side: "left", top: 74, flip: false }, { side: "right", top: 12, flip: true },
  ].slice(0, c >= 80 ? 4 : c >= 65 ? 3 : 2);
  return (
    <div className="pointer-events-none absolute inset-0 z-[23] overflow-hidden" aria-hidden>
      {hands.map((h, i) => (
        <img key={i} src={CUT.hand} alt="" className="shadow-hand"
          style={{ top: `${h.top}%`, [h.side]: `${-55 + reach * 30}%`, scale: h.flip ? "-1 1" : "1 1", animationDelay: `${i * 0.7}s`, opacity: 0.55 + reach * 0.4 }} />
      ))}
    </div>
  );
}

/* At the edge: the Guest's collage face flashes for a frame. */
function FaceFlash() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => { if (Math.random() < 0.35) setK((x) => x + 1); }, 2600);
    return () => window.clearInterval(t);
  }, []);
  if (!k) return null;
  return <img key={k} src={CUT.guest} alt="" aria-hidden className="face-flash" />;
}

/** Collage jumpscare: a photocopied face slams into the frame, shakes, and is gone. */
export function JumpScare({ img, onDone, ms = 1100 }: { img: string; onDone: () => void; ms?: number }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const sound = window.setTimeout(() => sfx("scare"), 105);
    const t = window.setTimeout(() => done.current(), ms);
    return () => { window.clearTimeout(sound); window.clearTimeout(t); };
  }, [ms]);
  return (
    <div className="jumpscare pointer-events-auto absolute inset-0 z-[60] grid place-items-center overflow-hidden" role="alert" aria-label="Something jumps out">
      <img src={img} alt="" className="jumpscare-img h-[88%] w-[92%] object-contain" />
    </div>
  );
}
