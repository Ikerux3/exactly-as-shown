import { useGame, type ColorKey } from "./store";

/** Spanish/English colour words the player is likely to type, mapped to muted collage tones. */
const WORDS: Record<string, string> = {
  red: "#b3262b", rojo: "#b3262b", roja: "#b3262b",
  blue: "#2f5d9a", azul: "#2f5d9a",
  green: "#4f7a3a", verde: "#4f7a3a",
  yellow: "#d9b23a", amarillo: "#d9b23a", amarilla: "#d9b23a",
  orange: "#d2702a", naranja: "#d2702a",
  purple: "#6b3f8f", morado: "#6b3f8f", morada: "#6b3f8f", violeta: "#7a4aa8", violet: "#7a4aa8", lila: "#a68bc4", lilac: "#a68bc4",
  pink: "#d77a9a", rosa: "#d77a9a", rosado: "#d77a9a",
  black: "#1b1a1d", negro: "#1b1a1d", negra: "#1b1a1d",
  white: "#ece6d8", blanco: "#ece6d8", blanca: "#ece6d8",
  grey: "#7d7a76", gray: "#7d7a76", gris: "#7d7a76",
  brown: "#6e4a2f", marron: "#6e4a2f", "marrón": "#6e4a2f", cafe: "#6e4a2f", "café": "#6e4a2f",
  gold: "#c79a3a", dorado: "#c79a3a", silver: "#a9adb2", plateado: "#a9adb2", plata: "#a9adb2",
  turquoise: "#2f9a95", turquesa: "#2f9a95", cyan: "#3aa3b5", celeste: "#7fb4d6",
  beige: "#cdb894", crimson: "#8c1c2b", granate: "#6e1a24", burdeos: "#6e1a24",
};

const SHADES: Record<string, number> = { oscuro: -0.35, oscura: -0.35, dark: -0.35, claro: 0.3, clara: 0.3, light: 0.3 };

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt),
  );
  return "#" + ch.map((c) => c.toString(16).padStart(2, "0")).join("");
}

/** Turns whatever the player typed ("rojo", "dark green", "teal") into a CSS colour. */
export function parseColorWord(input: string): { css: string; word: string } | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const words = raw.split(/\s+/);
  let amt = 0;
  let base: string | undefined;
  for (const w of words) {
    if (w in SHADES) amt = SHADES[w]!;
    else if (WORDS[w]) base = WORDS[w];
  }
  if (base) return { css: amt ? shade(base, amt) : base, word: input.trim() };
  const compact = raw.replace(/\s+/g, "");
  if (typeof CSS !== "undefined" && CSS.supports?.("color", compact)) {
    return { css: compact, word: input.trim() };
  }
  return null;
}

/** Repaints every --c-<key> use (clothes, pyjamas, tape) with the player's colour. */
export function applyCustomColor(key: ColorKey, css: string | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  if (css) root.setProperty(`--c-${key}`, css);
  else root.removeProperty(`--c-${key}`);
}

if (typeof window !== "undefined") {
  let last: string | undefined;
  const sync = () => {
    const s = useGame.getState();
    const sig = s.favColor + (s.favColorCss ?? "");
    if (sig === last) return;
    (["rose", "sage", "honey", "turq"] as ColorKey[]).forEach((k) => applyCustomColor(k, undefined));
    applyCustomColor(s.favColor, s.favColorCss);
    last = sig;
  };
  sync();
  useGame.subscribe(sync);
}
