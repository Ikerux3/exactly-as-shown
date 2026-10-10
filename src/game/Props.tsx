// Hand-built SVG props in a felt / wood / clay vocabulary.
import type { CSSProperties } from "react";
import { CUT } from "./assets";

const wood = "var(--wood)";
const woodL = "var(--wood-light)";
const brass = "var(--brass)";

export function ToyBox({ style, glow }: { style?: CSSProperties; glow?: boolean }) {
  return (
    <svg viewBox="0 0 200 150" style={style} className="prop" aria-hidden>
      <defs>
        <linearGradient id="tbw" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--wood-light)" />
          <stop offset="1" stopColor="var(--wood)" />
        </linearGradient>
      </defs>
      <path d="M14 40 L186 40 L178 140 L22 140 Z" fill="url(#tbw)" />
      <path d="M14 40 L186 40 L176 52 L24 52 Z" fill="var(--void)" opacity="0.65" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${20 + i} ${70 + i * 24} L${180 - i} ${70 + i * 24}`} stroke="oklch(0.25 0.04 50)" strokeWidth="2" opacity="0.4" />
      ))}
      <path d="M8 20 Q100 0 192 20 L186 40 L14 40 Z" fill="var(--rose)" />
      <path d="M14 33 Q100 16 186 33" stroke="var(--paper)" strokeDasharray="5 5" strokeWidth="2" fill="none" />
      <rect x="85" y="80" width="30" height="22" rx="4" fill="var(--paper)" opacity="0.9" />
      <text x="100" y="96" textAnchor="middle" fontSize="12" fontFamily="var(--font-hand)" fill="var(--ink)">toys</text>
      {glow && <rect x="14" y="40" width="172" height="100" fill="var(--honey)" opacity="0.15" />}
    </svg>
  );
}

export function Cushion({ style, color = "var(--sage)" }: { style?: CSSProperties; color?: string }) {
  return (
    <svg viewBox="0 0 160 110" style={style} className="prop" aria-hidden>
      <path d="M12 20 Q80 -4 148 20 Q160 55 148 90 Q80 112 12 90 Q0 55 12 20 Z" fill={color} />
      <path d="M22 28 Q80 8 138 28 Q148 55 138 82 Q80 100 22 82 Q12 55 22 28 Z" fill="none" stroke="var(--paper)" strokeDasharray="4 5" strokeWidth="2" opacity="0.8" />
      <circle cx="80" cy="55" r="6" fill="var(--paper-deep)" />
      <path d="M50 45 q10 -12 20 0 q10 12 20 0" stroke="var(--rose)" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function Dresser({ style, open }: { style?: CSSProperties; open: boolean }) {
  return (
    <svg viewBox="0 0 180 200" style={style} className="prop" aria-hidden overflow="visible">
      <rect x="10" y="10" width="160" height="12" rx="3" fill={woodL} />
      <rect x="16" y="22" width="148" height="160" fill={wood} />
      <rect x="22" y="128" width="136" height="46" fill="var(--void)" opacity="0.9" />
      {/* top drawer */}
      <rect x="24" y="32" width="132" height="42" rx="3" fill={woodL} stroke="oklch(0.3 0.05 50)" />
      <circle cx="90" cy="53" r="5" fill={brass} />
      {/* middle drawer (the one that opens) */}
      <g style={{ transform: open ? "translate(0px, 26px) scale(1.08)" : "none", transformOrigin: "90px 105px", transition: "transform 0.5s cubic-bezier(.2,.8,.2,1)" }}>
        {open && <path d="M24 82 L156 82 L166 76 L14 76 Z" fill="oklch(0.22 0.03 50)" />}
        <rect x="24" y="82" width="132" height="42" rx="3" fill={woodL} stroke="oklch(0.3 0.05 50)" />
        <circle cx="90" cy="103" r="5" fill={brass} />
      </g>
      {!open && (
        <>
          <rect x="24" y="132" width="132" height="42" rx="3" fill={woodL} stroke="oklch(0.3 0.05 50)" />
          <circle cx="90" cy="153" r="5" fill={brass} />
        </>
      )}
      <rect x="20" y="182" width="10" height="14" fill={wood} />
      <rect x="150" y="182" width="10" height="14" fill={wood} />
    </svg>
  );
}

export function Cupboard({ open, style, kind }: { open: boolean; style?: CSSProperties; kind: "door" | "drawer" }) {
  if (kind === "drawer") {
    return (
      <svg viewBox="0 0 120 70" style={style} aria-hidden overflow="visible">
        <rect x="2" y="2" width="116" height="66" rx="4" fill="oklch(0.18 0.03 50)" />
        <g style={{ transform: open ? "translateY(26px)" : "none", transition: "transform .45s cubic-bezier(.2,.8,.2,1)" }}>
          <rect x="6" y="6" width="108" height="58" rx="3" fill="var(--sage)" stroke="oklch(0.4 0.04 140)" strokeWidth="2" />
          <rect x="14" y="14" width="92" height="42" rx="2" fill="none" stroke="oklch(0.5 0.05 140)" />
          <rect x="48" y="30" width="24" height="7" rx="3" fill={brass} />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" style={style} aria-hidden overflow="visible">
      <rect x="2" y="2" width="116" height="146" rx="4" fill="oklch(0.2 0.03 50)" />
      <rect x="8" y="72" width="104" height="5" fill={woodL} />
      <g style={{ transform: open ? "perspective(400px) rotateY(-78deg)" : "none", transformOrigin: "6px 75px", transition: "transform .55s cubic-bezier(.2,.8,.2,1)" }}>
        <rect x="6" y="6" width="108" height="138" rx="3" fill="var(--sage)" stroke="oklch(0.4 0.04 140)" strokeWidth="2" />
        <rect x="16" y="16" width="88" height="118" rx="2" fill="none" stroke="oklch(0.5 0.05 140)" strokeWidth="2" />
        <circle cx="98" cy="75" r="5" fill={brass} />
      </g>
    </svg>
  );
}

export function Plate({ color, big, style }: { color: string; big?: boolean | undefined; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 60" style={style} aria-hidden>
      <ellipse cx="50" cy="34" rx={big ? 48 : 40} ry={big ? 24 : 20} fill="oklch(0.2 0.02 50 / .35)" />
      <ellipse cx="50" cy="30" rx={big ? 48 : 40} ry={big ? 24 : 20} fill="var(--paper)" />
      <ellipse cx="50" cy="30" rx={big ? 34 : 28} ry={big ? 16 : 13} fill="none" stroke={color} strokeWidth="4" />
      <ellipse cx="50" cy="30" rx={big ? 24 : 18} ry={big ? 10 : 8} fill="var(--paper-deep)" />
    </svg>
  );
}
export function Glass({ color, big, style }: { color: string; big?: boolean | undefined; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 90" style={style} aria-hidden>
      <path d={big ? "M4 6 L56 6 L50 86 L10 86 Z" : "M12 14 L48 14 L44 84 L16 84 Z"} fill="oklch(0.95 0.02 220 / .55)" stroke="var(--paper)" strokeWidth="2" />
      <path d={big ? "M10 50 L50 50 L48 80 L12 80 Z" : "M15 52 L45 52 L43 80 L17 80 Z"} fill={color} opacity="0.75" />
      <path d="M20 20 L22 70" stroke="oklch(1 0 0 / .6)" strokeWidth="3" />
    </svg>
  );
}
export function Cutlery({ color, big, style }: { color: string; big?: boolean | undefined; style?: CSSProperties }) {
  const s = big ? 1.5 : 1;
  return (
    <svg viewBox="0 0 70 100" style={style} aria-hidden>
      <g transform={`scale(${s}) translate(${big ? -12 : 0} ${big ? -16 : 0})`}>
        <rect x="18" y="40" width="7" height="50" rx="3" fill={color} />
        <path d="M14 8 L14 34 Q21 44 28 34 L28 8" stroke="var(--brass)" strokeWidth="3" fill="none" />
        <path d="M21 8 L21 36" stroke="var(--brass)" strokeWidth="3" />
        <rect x="44" y="40" width="7" height="50" rx="3" fill={color} />
        <path d="M47 6 Q58 22 47 42 Q40 22 47 6 Z" fill="var(--brass)" />
      </g>
    </svg>
  );
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
      <svg viewBox="0 0 60 80" className="h-full w-full drop-shadow-lg" aria-hidden>
        <rect x="4" y="4" width="52" height="72" rx="8" fill="var(--paper-deep)" stroke="var(--brass)" strokeWidth="3" />
        <circle cx="30" cy="12" r="2.5" fill="var(--brass)" />
        <circle cx="30" cy="68" r="2.5" fill="var(--brass)" />
        <rect x="20" y="22" width="20" height="36" rx="5" fill="oklch(0.3 0.03 60)" />
        <rect x="22" y={on ? 24 : 38} width="16" height="18" rx="4" fill="var(--brass)" style={{ transition: "y .15s" }} />
      </svg>
    </button>
  );
}

export function PhotoFrame({ style, wrong }: { style?: CSSProperties; wrong?: boolean }) {
  return (
    <svg viewBox="0 0 80 100" style={style} className="prop" aria-hidden>
      <rect x="2" y="2" width="76" height="96" rx="3" fill="var(--brass)" />
      <rect x="10" y="10" width="60" height="80" fill="oklch(0.75 0.04 70)" />
      <circle cx="32" cy="40" r="9" fill="oklch(0.45 0.04 50)" />
      <path d="M18 88 Q32 56 46 88 Z" fill="oklch(0.45 0.06 340)" />
      <circle cx="54" cy="56" r="6" fill="oklch(0.45 0.04 50)" />
      <path d="M44 88 Q54 66 64 88 Z" fill="oklch(0.55 0.05 30)" />
      {wrong && <path d="M66 30 C70 50 70 70 66 90 L60 90 C58 70 58 50 62 30 Z" fill="var(--void)" />}
    </svg>
  );
}
export function Clock({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 80 80" style={style} className="prop" aria-hidden>
      <circle cx="40" cy="40" r="36" fill={wood} />
      <circle cx="40" cy="40" r="29" fill="var(--paper)" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x="39" y="13" width="2" height="5" fill="var(--ink)" transform={`rotate(${i * 30} 40 40)`} />
      ))}
      <path d="M40 40 L40 22" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 40 L52 46" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
export function TrinketBox({ style, open }: { style?: CSSProperties; open?: boolean }) {
  return (
    <svg viewBox="0 0 100 70" style={style} className="prop" aria-hidden>
      <rect x="10" y="28" width="80" height="38" rx="4" fill="var(--c-plum)" />
      <path d="M14 32 L86 32" stroke="var(--brass)" strokeDasharray="4 3" strokeWidth="2" />
      <g style={{ transform: open ? "rotate(-25deg)" : "none", transformOrigin: "10px 28px", transition: "transform .4s" }}>
        <rect x="6" y="16" width="88" height="14" rx="4" fill="var(--rose)" />
      </g>
      <rect x="45" y="36" width="10" height="8" rx="2" fill="var(--brass)" />
    </svg>
  );
}
export function Pajamas({ style, color }: { style?: CSSProperties; color: string }) {
  return (
    <svg viewBox="0 0 120 70" style={style} className="prop" aria-hidden>
      <path d="M6 30 Q60 18 114 30 L110 62 Q60 72 10 62 Z" fill={color} />
      <path d="M6 30 Q60 40 114 30" stroke="oklch(1 0 0 / .4)" strokeWidth="2" fill="none" />
      {[20, 45, 70, 95].map((x) => (
        <circle key={x} cx={x} cy={48} r="3" fill="var(--paper)" opacity=".8" />
      ))}
      <path d="M12 58 Q60 66 108 58" stroke="var(--paper)" strokeDasharray="4 4" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
export function Toothbrush({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 30 100" style={style} className="prop" aria-hidden>
      <rect x="11" y="20" width="8" height="78" rx="4" fill="var(--turq)" />
      <rect x="9" y="2" width="12" height="22" rx="2" fill="var(--paper)" />
      {[5, 9, 13, 17].map((y) => <path key={y} d={`M9 ${y} L21 ${y}`} stroke="var(--paper-deep)" />)}
    </svg>
  );
}
export function Key({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 50" style={style} className="prop" aria-hidden>
      <circle cx="20" cy="25" r="15" fill="none" stroke="var(--brass)" strokeWidth="7" />
      <path d="M35 25 L92 25 M78 25 L78 40 M88 25 L88 36" stroke="var(--brass)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
