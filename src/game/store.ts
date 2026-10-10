import { create } from "zustand";

export type Screen =
  | "title" | "intro" | "ch1" | "ch2k" | "ch2d" | "ch3" | "ch4" | "ch5" | "final" | "ending";

export type ColorKey = "rose" | "sage" | "honey" | "turq";
export type MotherColor = "plum" | "navy" | "mustard";
export type ToyId = "bear" | "rabbit" | "train" | "doll" | "elephant";

export const COLOR_LABEL: Record<ColorKey, string> = {
  rose: "Rose", sage: "Sage", honey: "Honey", turq: "Sea blue",
};
export const MOTHER_LABEL: Record<MotherColor, string> = {
  plum: "plum", navy: "navy", mustard: "mustard",
};
export const TOY_LABEL: Record<ToyId, string> = {
  bear: "teddy bear", rabbit: "felt rabbit", train: "wooden train", doll: "rag doll", elephant: "knitted elephant",
};

export type Line = { speaker: "mother" | "guest" | "mimic" | "child" | "narrator"; text: string; ms?: number | undefined };

export type Facts = {
  firstToy?: ToyId | undefined;
  mistakes: number;
  darkSeconds: number;
  lightToggles: number;
  revisits: number;
  previousRuns: number;
};

type State = {
  screen: Screen;
  name: string;
  favColor: ColorKey;
  motherColor: MotherColor;
  favFood?: string | undefined;
  toyOrder: [ToyId, ToyId, ToyId, ToyId, ToyId]; // role index -> toy
  cordura: number;
  lightsOn: boolean;
  interactive: boolean;
  phaseKey: number;
  scare: boolean;
  scareArmed: boolean;
  flicker: number;
  shadowPass: number;
  queue: Line[];
  line?: Line | undefined;
  objective: string;
  objectiveOpen: boolean;
  muted: boolean;
  facts: Facts;
  finalCordura?: number | undefined;
  // checkpoints
  ch1: ToyId[];
  ch2Items: string[];
  ch2Placed: string[];
  ch3Rounds: number;
};

type Actions = {
  set: (p: Partial<State>) => void;
  go: (s: Screen) => void;
  say: (lines: Line | Line[]) => void;
  nextLine: () => void;
  addCordura: (n: number) => void;
  setLights: (on: boolean) => void;
  fact: (f: Partial<Facts>) => void;
  mistake: () => void;
  newRun: () => void;
};

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
}

const initial = (): Omit<State, "muted"> => ({
  screen: "title",
  name: "",
  favColor: "rose",
  motherColor: (["plum", "navy", "mustard"] as MotherColor[])[Math.floor(Math.random() * 3)]!,
  favFood: undefined,
  toyOrder: shuffle<ToyId>(["bear", "rabbit", "train", "doll", "elephant"]) as State["toyOrder"],
  cordura: 0,
  lightsOn: true,
  interactive: false,
  phaseKey: 0,
  scare: false,
  scareArmed: true,
  flicker: 0,
  shadowPass: 0,
  queue: [],
  line: undefined,
  objective: "",
  objectiveOpen: true,
  facts: { mistakes: 0, darkSeconds: 0, lightToggles: 0, revisits: 0, previousRuns: 0 },
  finalCordura: undefined,
  ch1: [],
  ch2Items: [],
  ch2Placed: [],
  ch3Rounds: 0,
});

export const useGame = create<State & Actions>((set, get) => ({
  ...initial(),
  muted: false,
  set: (p) => set(p),
  go: (screen) => set({ screen, queue: [], line: undefined, lightsOn: true, interactive: false, objectiveOpen: true }),
  say: (lines) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    const s = get();
    if (!s.line) set({ line: arr[0], queue: [...s.queue, ...arr.slice(1)] });
    else set({ queue: [...s.queue, ...arr] });
  },
  nextLine: () => {
    const [n, ...rest] = get().queue;
    set({ line: n, queue: rest });
  },
  addCordura: (n) => set((s) => ({ cordura: Math.max(0, Math.min(100, s.cordura + n)) })),
  setLights: (on) =>
    set((s) => ({ lightsOn: on, facts: { ...s.facts, lightToggles: s.facts.lightToggles + 1 } })),
  fact: (f) => set((s) => ({ facts: { ...s.facts, ...f } })),
  mistake: () => set((s) => ({ facts: { ...s.facts, mistakes: s.facts.mistakes + 1 } })),
  newRun: () => {
    const muted = get().muted;
    const prev = loadMemory();
    const base = initial();
    set({ ...base, muted, facts: { ...base.facts, previousRuns: prev.runs } });
  },
}));

const MEM_KEY = "mwbb-memory-v1";
export type Memory = { runs: number; lastName?: string; lastToy?: ToyId; lastEnding?: "composed" | "crying" };
export function loadMemory(): Memory {
  if (typeof window === "undefined") return { runs: 0 };
  try {
    return JSON.parse(localStorage.getItem(MEM_KEY) || "") as Memory;
  } catch {
    return { runs: 0 };
  }
}
export function saveMemory(m: Memory) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function sanitizeName(raw: string): string {
  const clean = raw.replace(/[^\p{L}\s'-]/gu, "").trim().slice(0, 14);
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
if (typeof window !== "undefined" && import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
