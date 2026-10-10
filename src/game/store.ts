import { create } from "zustand";
import type { AdaptiveChapter, AdaptivePlan } from "./ai/contracts";
import { setMuted as setAudioMuted } from "./audio";

export type Screen =
  | "title" | "intro" | "prologue" | "ch1" | "ch2k" | "ch2d" | "ch3" | "ch4" | "ch5" | "final" | "ending";

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

export const CHAPTER_TITLE: Record<number, string> = {
  1: "The Playroom", 2: "Table for Three", 3: "The Music Box", 4: "Mother's Room", 5: "Bedtime",
};

export type Line = {
  speaker: "mother" | "guest" | "mimic" | "child" | "narrator";
  text: string;
  ms?: number | undefined;
  /** Runs once when the line appears on screen (keeps cutscene effects in sync with skipping). */
  onShow?: (() => void) | undefined;
};

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
  favToy?: string | undefined;
  favToyId?: ToyId | undefined;
  /** What the Guest says about your favourite toy; spoken at the end of the prologue. */
  introGuestLine?: string | undefined;
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
  paused: boolean;
  muted: boolean;
  facts: Facts;
  adaptations: Partial<Record<AdaptiveChapter, AdaptivePlan>>;
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
  continueRun: () => boolean;
  setMute: (m: boolean) => void;
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
  favToy: undefined,
  favToyId: undefined,
  introGuestLine: undefined,
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
  paused: false,
  facts: { mistakes: 0, darkSeconds: 0, lightToggles: 0, revisits: 0, previousRuns: 0 },
  adaptations: {},
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
  go: (screen) => {
    set({ screen, queue: [], line: undefined, lightsOn: true, interactive: false, paused: false, objective: "" });
    if (RESUMABLE.includes(screen)) writeSave(get());
    else if (screen === "final" || screen === "ending") clearSave();
  },
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
    clearSave();
    set({ ...base, muted, facts: { ...base.facts, previousRuns: prev.runs } });
  },
  continueRun: () => {
    const save = loadSave();
    if (!save) return false;
    const base = initial();
    set({ ...base, muted: get().muted, ...save, screen: "title" });
    get().go(save.screen);
    return true;
  },
  setMute: (m) => {
    set({ muted: m });
    setAudioMuted(m);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: m })); } catch { /* ignore */ }
  },
}));

const SETTINGS_KEY = "mwbb-settings-v1";
/** Restore persisted player settings (call once on the client). */
export function restoreSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as { muted?: unknown };
    if (s.muted === true) useGame.getState().setMute(true);
  } catch { /* ignore */ }
}

/* ---- Chapter checkpoint save (resume from the start of the last chapter reached) ---- */
const SAVE_KEY = "mwbb-save-v1";
const RESUMABLE: Screen[] = ["ch1", "ch2k", "ch2d", "ch3", "ch4", "ch5"];
const TOYS: ToyId[] = ["bear", "rabbit", "train", "doll", "elephant"];
type Save = Pick<
  State,
  "screen" | "name" | "favColor" | "motherColor" | "favFood" | "favToy" | "favToyId" | "toyOrder" | "cordura" | "facts" | "adaptations" | "ch1" | "ch2Items" | "ch2Placed" | "ch3Rounds"
>;

function writeSave(s: State) {
  const save: Save = {
    screen: s.screen, name: s.name, favColor: s.favColor, motherColor: s.motherColor, favFood: s.favFood,
    favToy: s.favToy, favToyId: s.favToyId, toyOrder: s.toyOrder, cordura: s.cordura, facts: s.facts,
    adaptations: s.adaptations, ch1: s.ch1, ch2Items: s.ch2Items,
    ch2Placed: s.ch2Placed, ch3Rounds: s.ch3Rounds,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function loadSave(): Save | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") as Save | null;
    const valid =
      !!s && RESUMABLE.includes(s.screen) && typeof s.name === "string" && s.name.length > 0 &&
      s.favColor in COLOR_LABEL && s.motherColor in MOTHER_LABEL &&
      Array.isArray(s.toyOrder) && s.toyOrder.length === 5 && s.toyOrder.every((t) => TOYS.includes(t)) &&
      typeof s.cordura === "number" && !!s.facts && Array.isArray(s.ch1) && Array.isArray(s.ch2Items) &&
      Array.isArray(s.ch2Placed) && typeof s.ch3Rounds === "number";
    return valid ? s : null;
  } catch {
    return null;
  }
}

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
export function forgetMemory() {
  try { localStorage.removeItem(MEM_KEY); } catch { /* ignore */ }
}

export function sanitizeName(raw: string): string {
  const clean = raw.replace(/[^\p{L}\s'-]/gu, "").trim().slice(0, 14);
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
if (typeof window !== "undefined" && import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
