// Hand-built SVG props in a felt / wood / clay vocabulary.
import type { CSSProperties } from "react";
import type React from "react";
import { CUT, PROP, PROP2 } from "./assets";

function Tape({ color }: { color: string }) {
  return <span aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] h-[18%] min-h-2 w-[46%] -translate-x-1/2 -rotate-6 opacity-85 mix-blend-multiply" style={{ background: color, boxShadow: "0 1px 2px oklch(0 0 0 / .4)" }} />;
}
function Cut({ src, style, ratio, children }: { src: string; style?: CSSProperties | undefined; ratio: string; children?: React.ReactNode }) {
  return (
    <div style={{ position: "relative", aspectRatio: ratio, ...style }} className="prop">
      <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full object-contain" style={{ filter: "sepia(.35) contrast(1.1) drop-shadow(2px 3px 0 oklch(0 0 0 / .55))" }} />
      {children}
    </div>
  );
}


const wood = "var(--wood)";
const woodL = "var(--wood-light)";
const brass = "var(--brass)";

export function ToyBox({ style, glow }: { style?: CSSProperties; glow?: boolean }) {
  return <Cut src={PROP.toybox} style={{ ...style, filter: glow ? "drop-shadow(0 0 10px var(--glow))" : undefined }} ratio="4 / 3" />;
}

export function Cushion({ style }: { style?: CSSProperties; color?: string }) {
  return <Cut src={PROP.cushion} style={style} ratio="3 / 2" />;
}

export function Dresser({ style, open }: { style?: CSSProperties; open: boolean }) {
  return (
    <Cut src={PROP2.dresser} style={style} ratio="1 / 1">
      {/* the middle drawer slides out toward the player */}
      <span aria-hidden className="pointer-events-none absolute left-[22%] top-[43%] h-[14%] w-[56%] transition-all duration-500"
        style={{ background: "oklch(0.12 0.02 50)", opacity: open ? 0.95 : 0, transform: open ? "translateY(18%) scale(1.12)" : "none", boxShadow: open ? "0 6px 0 oklch(0.3 0.04 50), 0 10px 12px oklch(0 0 0 / .6)" : "none" }} />
    </Cut>
  );
}

export function Cupboard({ style, kind }: { open: boolean; style?: CSSProperties; kind: "door" | "drawer" }) {
  return (
    <img src={kind === "door" ? PROP.door : PROP.drawer} alt="" draggable={false} className="prop pointer-events-none object-cover"
      style={{ aspectRatio: kind === "door" ? "4 / 5" : "12 / 7", filter: "sepia(.3) contrast(1.05)", ...style }} />
  );
}

export function Plate({ color, big, style }: { color: string; big?: boolean | undefined; style?: CSSProperties }) {
  return <Cut src={PROP.plate} style={{ ...style, transform: big ? "scale(1.15)" : undefined }} ratio="3 / 2">{!big && <Tape color={color} />}</Cut>;
}
export function Glass({ color, big, style }: { color: string; big?: boolean | undefined; style?: CSSProperties }) {
  return <Cut src={PROP.glass} style={{ ...style, transform: big ? "scale(1.15)" : undefined }} ratio="2 / 3">{!big && <Tape color={color} />}</Cut>;
}
export function Cutlery({ color, big, style }: { color: string; big?: boolean | undefined; style?: CSSProperties }) {
  return <Cut src={PROP.cutlery} style={{ ...style, transform: big ? "scale(1.15)" : undefined }} ratio="2 / 3">{!big && <Tape color={color} />}</Cut>;
}

export type Sym = "star" | "moon" | "heart" | "key" | "flower" | "eye";
export function Symbol({ s, size = 48, className, color = "currentColor" }: { s: Sym; size?: number; className?: string | undefined; color?: string | undefined }) {
  const p = {
    star: "M50 8 L61 38 L94 38 L67 58 L77 90 L50 70 L23 90 L33 58 L6 38 L39 38 Z",
    moon: "M62 10 A40 40 0 1 0 90 66 A32 32 0 1 1 62 10 Z",
    heart: "M50 88 C10 60 4 36 20 22 C34 10 48 20 50 30 C52 20 66 10 80 22 C96 36 90 60 50 88 Z",
    key: "M30 30 A18 18 0 1 1 30 66 A18 18 0 1 1 30 30 Z M46 46 L92 46 L92 56 L84 56 L84 66 L74 66 L74 56 L46 56 Z",
    flower: "M50 50 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 M50 14 a14 14 0 0 1 0 28 a14 14 0 0 1 0 -28 M50 58 a14 14 0 0 1 0 28 a14 14 0 0 1 0 -28 M14 50 a14 14 0 0 1 28 0 a14 14 0 0 1 -28 0 M58 50 a14 14 0 0 1 28 0 a14 14 0 0 1 -28 0",
    eye: "M6 50 Q50 6 94 50 Q50 94 6 50 Z M50 34 a16 16 0 1 0 0.01 0 Z",
  }[s];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <path d={p} fill={color} fillRule="evenodd" stroke="oklch(0.25 0.03 50 / .5)" strokeWidth="2" strokeDasharray="4 3" />
    </svg>
  );
}

export function GuestVoid({ style, intensity = 1 }: { style?: CSSProperties; intensity?: number }) {
  return (
    <img src={CUT.guest} alt="" aria-hidden draggable={false} className="guest-cut pointer-events-none absolute"
      style={{ width: "auto", ...style, opacity: intensity * ((style?.opacity as number | undefined) ?? 1) }} />
  );
}

export function LightSwitch({ on, onToggle, disabled, hint }: { on: boolean; onToggle: () => void; disabled?: boolean; hint?: boolean | undefined }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={on ? "Turn the lights off" : "Turn the lights on"}
      aria-pressed={on}
      className={`relative h-full shrink-0 aspect-[3/4] transition-[transform,opacity] active:scale-95 disabled:opacity-40 ${hint && !disabled ? "switch-hint" : ""}`}
    >
      <img src={PROP2.switch} alt="" draggable={false} className="h-full w-full object-contain"
        style={{ filter: `sepia(.35) contrast(1.1) drop-shadow(2px 3px 0 oklch(0 0 0 / .55))${on ? "" : " brightness(.7)"}`, transform: on ? "none" : "scaleY(-1)", transition: "transform .15s" }} />
    </button>
  );
}

export function PhotoFrame({ style, wrong }: { style?: CSSProperties; wrong?: boolean }) {
  return (
    <Cut src={PROP2.photoframe} style={style} ratio="752 / 896">
      {wrong && <span aria-hidden className="pointer-events-none absolute right-[22%] top-[28%] h-[52%] w-[14%] rounded-full" style={{ background: "var(--void)", filter: "blur(2px)" }} />}
    </Cut>
  );
}
export function Clock({ style }: { style?: CSSProperties }) {
  return <Cut src={PROP.clock} style={style} ratio="1 / 1" />;
}
export function TrinketBox({ style, open }: { style?: CSSProperties; open?: boolean }) {
  return <Cut src={PROP2.trinketbox} style={{ ...style, transform: open ? "rotate(-4deg) translateY(-3%)" : style?.transform }} ratio="896 / 752" />;
}
export function Pajamas({ style, color }: { style?: CSSProperties; color: string }) {
  return <Cut src={PROP2.pajamas} style={style} ratio="896 / 752"><Tape color={color} /></Cut>;
}
export function Toothbrush({ style }: { style?: CSSProperties }) {
  return <Cut src={PROP2.toothbrush} style={style} ratio="672 / 992" />;
}
export function Key({ style }: { style?: CSSProperties }) {
  return <Cut src={PROP2.key} style={style} ratio="992 / 672" />;
}

/* ---- Black cardboard cut-out characters (pinned with a strip of masking tape) ---- */
const CARD = "oklch(0.08 0.01 270)";
const CARD_SHADOW = "drop-shadow(5px 6px 0 oklch(0 0 0 / .5))";
/** a thin rim of white board, as if cut out with scissors */
const EDGE = { stroke: "oklch(0.88 0.03 85)", strokeWidth: 2.4, strokeLinejoin: "round" as const, paintOrder: "stroke" };

/** Mommy: faceless cardboard silhouette; the stitched stripe is the colour of her coat. */
export function MotherCutout({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 170" className={className} style={{ filter: CARD_SHADOW, ...style }} aria-hidden>
      <path d="M30 6 C40 6 44 15 43 24 C42 33 37 38 30 38 C23 38 18 33 17 24 C16 15 20 6 30 6 Z M14 46 Q30 38 46 46 L50 70 L56 160 L34 162 L32 120 L28 120 L26 162 L4 160 L10 70 Z" fill={CARD} {...EDGE} />
      <path d="M48 96 l10 2 l-1 20 l-12 -1 Z" fill={CARD} {...EDGE} />
      <path d="M22 52 L38 52" stroke={color} strokeWidth="3" strokeDasharray="3 3" />
      <rect x="24" y="2" width="12" height="5" fill="oklch(0.88 0.08 90 / .7)" transform="rotate(-8 30 4)" />
    </svg>
  );
}

/** The child, seen from behind, holding their favourite toy. */
export function ChildCutout({ color, toy, className, style }: { color: string; toy?: string | undefined; className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={{ aspectRatio: "44 / 100", ...style }} aria-hidden>
      <svg viewBox="0 0 44 100" className="absolute inset-0 h-full w-full overflow-visible" style={{ filter: CARD_SHADOW }}>
        <path d="M22 4 C30 4 34 10 33 17 C32 25 28 29 22 29 C16 29 12 25 11 17 C10 10 14 4 22 4 Z" fill={CARD} {...EDGE} />
        <path d="M10 34 Q22 27 34 34 L37 66 L30 67 L29 96 L23 97 L22 72 L21 97 L15 96 L14 67 L7 66 Z" fill={CARD} {...EDGE} />
        <path d="M10 36 L3 60 L7 62 L14 43 Z M34 36 L41 58 L37 61 L30 43 Z" fill={CARD} {...EDGE} />
        <path d="M14 41 L30 41" stroke={color} strokeWidth="2.5" strokeDasharray="2.5 2.5" />
        <rect x="16" y="0" width="12" height="4.5" fill="oklch(0.88 0.08 90 / .7)" transform="rotate(6 22 2)" />
      </svg>
      {toy && (
        <img src={toy} alt="" draggable={false} className="absolute left-[72%] top-[52%] w-[62%] -rotate-12"
          style={{ filter: "sepia(.35) contrast(1.1) drop-shadow(2px 3px 0 oklch(0 0 0 / .55))" }} />
      )}
    </div>
  );
}
