import { create } from "zustand";
import type { AdaptiveChapter, AdaptivePlan, RealtimeDecision } from "./ai/contracts";
import { restoreFavoriteToyImage } from "./ai/toy-image";
import { setMuted as setAudioMuted } from "./audio";
import { containsUnsafeContent, safePlayerText } from "./safety";

export type Screen =
  | "title"
  | "intro"
  | "prologue"
  | "ch1"
  | "ch2k"
  | "ch2d"
  | "ch3"
  | "ch4"
  | "ch5"
  | "final"
  | "ending";

export type ColorKey = "rose" | "sage" | "honey" | "turq";
export type MotherColor = "plum" | "navy" | "mustard";
export type ToyId = "bear" | "rabbit" | "train" | "doll" | "elephant";

export const COLOR_LABEL: Record<ColorKey, string> = {
  rose: "Rose",
  sage: "Sage",
  honey: "Honey",
  turq: "Sea blue",
};
export const MOTHER_LABEL: Record<MotherColor, string> = {
  plum: "plum",
  navy: "navy",
  mustard: "mustard",
};
export const TOY_LABEL: Record<ToyId, string> = {
  bear: "teddy bear",
  rabbit: "felt rabbit",
  train: "wooden train",
  doll: "rag doll",
  elephant: "knitted elephant",
};

export const CHAPTER_TITLE: Record<number, string> = {
  1: "The Playroom",
  2: "Table for Three",
  3: "The Music Box",
  4: "Mother's Room",
  5: "Bedtime",
};

export type Line = {
  speaker: "mother" | "guest" | "mimic" | "child" | "narrator";
  text: string;
  ms?: number | undefined;
  /** Spoken prompt rendered elsewhere (for example an answer form), not in the subtitle bar. */
  voiceOnly?: boolean | undefined;
  /** Runs once when the line appears on screen (keeps cutscene effects in sync with skipping). */
  onShow?: (() => void) | undefined;
  /** Runs after speech/subtitle completion or a manual skip. Runtime-only; never persisted. */
  onDone?: (() => void) | undefined;
};

export type Facts = {
  firstToy?: ToyId | undefined;
  mistakes: number;
  darkSeconds: number;
  lightToggles: number;
  revisits: number;
  previousRuns: number;
  dialogueSkips: number;
  hintsUsed: number;
  inspections: number;
  recoveries: number;
  currentMistakeStreak: number;
  maxMistakeStreak: number;
  completedCheckpoints: number;
  fastCompletions: number;
  slowCompletions: number;
  responseTimesMs: number[];
  choiceTrail: string[];
};

type State = {
  screen: Screen;
  name: string;
  favColor: ColorKey;
  /** The player's own colour word, rendered into the --c-<favColor> slot. */
  favColorCss?: string | undefined;
  favColorWord?: string | undefined;
  motherColor: MotherColor;
  favFood?: string | undefined;
  favToy?: string | undefined;
  favToyId?: ToyId | undefined;
  /** Static slot replaced by the generated favourite-toy prop. */
  favToyVisualSlot?: ToyId | undefined;
  /** Small persistent cache key; the generated image bytes never enter localStorage. */
  favToyAssetKey?: string | undefined;
  /** Runtime data/blob URL, deliberately excluded from chapter saves. */
  favToyImage?: string | undefined;
  /** What the Guest says about your favourite toy; spoken at the end of the prologue. */
  introGuestLine?: string | undefined;
  toyOrder: [ToyId, ToyId, ToyId, ToyId, ToyId]; // role index -> toy
  cordura: number;
  lightsOn: boolean;
  interactive: boolean;
  phaseKey: number;
  scare: boolean;
  scareArmed: boolean;
  /** Scripted 3s error blackout is charged exactly +9 separately from the normal ticker. */
  forcedBlackout: boolean;
  flicker: number;
  shadowPass: number;
  queue: Line[];
  line?: Line | undefined;
  objective: string;
  paused: boolean;
  muted: boolean;
  facts: Facts;
  adaptations: Partial<Record<AdaptiveChapter, AdaptivePlan>>;
  adaptiveMoments: Record<string, RealtimeDecision>;
  finalCordura?: number | undefined;
  /** First MG01 pickup escapes once on its original wall, even across scare remounts. */
  toyEscape?: { toy: ToyId; wall: number; x: number; y: number; escapedAt?: number | undefined; recovered: boolean } | undefined;
  // checkpoints
  ch1: ToyId[];
  ch2Items: string[];
  ch2Placed: string[];
  ch3Rounds: number;
  /** Legacy save field retained for compatibility; MG01 no longer catapults toys. */
  toyCatapultUsed: boolean;
};

type Actions = {
  set: (p: Partial<State>) => void;
  go: (s: Screen) => void;
  say: (lines: Line | Line[]) => void;
  nextLine: (manual?: boolean) => void;
  addCordura: (n: number) => void;
  setLights: (on: boolean) => void;
  fact: (f: Partial<Facts>) => void;
  mistake: () => void;
  success: (responseMs?: number) => void;
  observeChoice: (choice: string) => void;
  useHint: () => void;
  inspect: (choice?: string) => void;
  setFavoriteToyAsset: (asset: { key: string; imageUrl: string }) => void;
  hydrateFavoriteToyAsset: () => Promise<void>;
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
  favToyVisualSlot: undefined,
  favToyAssetKey: undefined,
  favToyImage: undefined,
  introGuestLine: undefined,
  toyOrder: shuffle<ToyId>(["bear", "rabbit", "train", "doll", "elephant"]) as State["toyOrder"],
  cordura: 0,
  lightsOn: true,
  interactive: false,
  phaseKey: 0,
  scare: false,
  scareArmed: true,
  forcedBlackout: false,
  flicker: 0,
  shadowPass: 0,
  queue: [],
  line: undefined,
  objective: "",
  paused: false,
  facts: {
    mistakes: 0,
    darkSeconds: 0,
    lightToggles: 0,
    revisits: 0,
    previousRuns: 0,
    dialogueSkips: 0,
    hintsUsed: 0,
    inspections: 0,
    recoveries: 0,
    currentMistakeStreak: 0,
    maxMistakeStreak: 0,
    completedCheckpoints: 0,
    fastCompletions: 0,
    slowCompletions: 0,
    responseTimesMs: [],
    choiceTrail: [],
  },
  adaptations: {},
  adaptiveMoments: {},
  finalCordura: undefined,
  ch1: [],
  ch2Items: [],
  ch2Placed: [],
  ch3Rounds: 0,
  toyCatapultUsed: false,
  toyEscape: undefined,
});

export const useGame = create<State & Actions>((set, get) => ({
  ...initial(),
  muted: false,
  set: (p) => set(p),
  go: (screen) => {
    set({
      screen,
      queue: [],
      line: undefined,
      lightsOn: true,
      interactive: false,
      paused: false,
      objective: "",
    });
    if (RESUMABLE.includes(screen)) writeSave(get());
    else if (screen === "final" || screen === "ending") clearSave();
  },
  say: (lines) => {
    const arr = Array.isArray(lines) ? lines : [lines];
    const s = get();
    if (!s.line) set({ line: arr[0], queue: [...s.queue, ...arr.slice(1)] });
    else set({ queue: [...s.queue, ...arr] });
  },
  nextLine: (manual = false) => {
    const current = get().line;
    const [n, ...rest] = get().queue;
    set((s) => ({
      line: n,
      queue: rest,
      facts: manual ? { ...s.facts, dialogueSkips: s.facts.dialogueSkips + 1 } : s.facts,
    }));
    current?.onDone?.();
  },
  addCordura: (n) => set((s) => ({ cordura: Math.max(0, Math.min(100, s.cordura + n)) })),
  setLights: (on) =>
    set((s) => ({ lightsOn: on, facts: { ...s.facts, lightToggles: s.facts.lightToggles + 1 } })),
  fact: (f) => set((s) => ({ facts: { ...s.facts, ...f } })),
  mistake: () =>
    set((s) => {
      const streak = s.facts.currentMistakeStreak + 1;
      return {
        facts: {
          ...s.facts,
          mistakes: s.facts.mistakes + 1,
          currentMistakeStreak: streak,
          maxMistakeStreak: Math.max(s.facts.maxMistakeStreak, streak),
        },
      };
    }),
  success: (responseMs) =>
    set((s) => {
      const validMs =
        Number.isFinite(responseMs) && responseMs !== undefined
          ? Math.max(0, Math.min(3_600_000, Math.round(responseMs)))
          : undefined;
      return {
        facts: {
          ...s.facts,
          recoveries: s.facts.recoveries + (s.facts.currentMistakeStreak > 0 ? 1 : 0),
          currentMistakeStreak: 0,
          completedCheckpoints: s.facts.completedCheckpoints + 1,
          fastCompletions:
            s.facts.fastCompletions + (validMs !== undefined && validMs < 10_000 ? 1 : 0),
          slowCompletions:
            s.facts.slowCompletions + (validMs !== undefined && validMs > 30_000 ? 1 : 0),
          responseTimesMs:
            validMs === undefined
              ? s.facts.responseTimesMs
              : [...s.facts.responseTimesMs, validMs].slice(-12),
        },
      };
    }),
  observeChoice: (choice) =>
    set((s) => {
      const clean = choice
        .replace(/[<>\r\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);
      if (!clean || containsUnsafeContent(clean)) return {};
      return { facts: { ...s.facts, choiceTrail: [...s.facts.choiceTrail, clean].slice(-12) } };
    }),
  useHint: () => set((s) => ({ facts: { ...s.facts, hintsUsed: s.facts.hintsUsed + 1 } })),
  inspect: (choice) => {
    set((s) => ({ facts: { ...s.facts, inspections: s.facts.inspections + 1 } }));
    if (choice) get().observeChoice(choice);
  },
  setFavoriteToyAsset: ({ key, imageUrl }) => {
    set({ favToyAssetKey: key, favToyImage: imageUrl });
    const state = get();
    if (RESUMABLE.includes(state.screen)) writeSave(state);
  },
  hydrateFavoriteToyAsset: async () => {
    const { favToyAssetKey, favToyImage } = get();
    if (!favToyAssetKey || favToyImage) return;
    const imageUrl = await restoreFavoriteToyImage(favToyAssetKey);
    if (imageUrl && get().favToyAssetKey === favToyAssetKey) set({ favToyImage: imageUrl });
  },
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
    set({
      ...base,
      muted: get().muted,
      ...save,
      facts: { ...base.facts, ...save.facts },
      adaptations: save.adaptations ?? base.adaptations,
      adaptiveMoments: save.adaptiveMoments ?? base.adaptiveMoments,
      toyCatapultUsed: save.toyCatapultUsed ?? false,
      forcedBlackout: false,
      screen: "title",
    });
    get().go(save.screen);
    void get().hydrateFavoriteToyAsset();
    return true;
  },
  setMute: (m) => {
    set({ muted: m });
    setAudioMuted(m);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: m }));
    } catch {
      /* ignore */
    }
  },
}));

const SETTINGS_KEY = "mwbb-settings-v1";
/** Restore persisted player settings (call once on the client). */
export function restoreSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as { muted?: unknown };
    if (s.muted === true) useGame.getState().setMute(true);
  } catch {
    /* ignore */
  }
}

/* ---- Chapter checkpoint save (resume from the start of the last chapter reached) ---- */
const SAVE_KEY = "mwbb-save-v1";
const RESUMABLE: Screen[] = ["ch1", "ch2k", "ch2d", "ch3", "ch4", "ch5"];
const TOYS: ToyId[] = ["bear", "rabbit", "train", "doll", "elephant"];
type Save = Pick<
  State,
  | "screen"
  | "name"
  | "favColor"
  | "motherColor"
  | "favFood"
  | "favToy"
  | "favToyId"
  | "favToyVisualSlot"
  | "favToyAssetKey"
  | "toyOrder"
  | "cordura"
  | "facts"
  | "adaptations"
  | "adaptiveMoments"
  | "ch1"
  | "ch2Items"
  | "ch2Placed"
  | "ch3Rounds"
  | "toyCatapultUsed"
  | "toyEscape"
>;

/** Persist completed puzzle actions without changing scene or restarting the chapter. */
export function saveCheckpoint() {
  const state = useGame.getState();
  if (RESUMABLE.includes(state.screen)) writeSave(state);
}

function writeSave(s: State) {
  const save: Save = {
    screen: s.screen,
    name: s.name,
    favColor: s.favColor,
    favColorCss: s.favColorCss,
    favColorWord: s.favColorWord,
    motherColor: s.motherColor,
    favFood: s.favFood,
    favToy: s.favToy,
    favToyId: s.favToyId,
    favToyVisualSlot: s.favToyVisualSlot,
    favToyAssetKey: s.favToyAssetKey,
    toyOrder: s.toyOrder,
    cordura: s.cordura,
    facts: s.facts,
    adaptations: s.adaptations,
    adaptiveMoments: s.adaptiveMoments,
    ch1: s.ch1,
    ch2Items: s.ch2Items,
    ch2Placed: s.ch2Placed,
    ch3Rounds: s.ch3Rounds,
    toyCatapultUsed: s.toyCatapultUsed,
    toyEscape: s.toyEscape,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSave(): Save | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") as Save | null;
    const valid =
      !!s &&
      RESUMABLE.includes(s.screen) &&
      typeof s.name === "string" &&
      s.name.length > 0 &&
      s.favColor in COLOR_LABEL &&
      s.motherColor in MOTHER_LABEL &&
      Array.isArray(s.toyOrder) &&
      s.toyOrder.length === 5 &&
      s.toyOrder.every((t) => TOYS.includes(t)) &&
      typeof s.cordura === "number" &&
      !!s.facts &&
      Array.isArray(s.ch1) &&
      Array.isArray(s.ch2Items) &&
      Array.isArray(s.ch2Placed) &&
      typeof s.ch3Rounds === "number";
    if (!valid) return null;
    const blockedToy = !!s.favToy && containsUnsafeContent(s.favToy);
    const adaptations = Object.fromEntries(
      Object.entries(s.adaptations ?? {}).filter(
        ([, plan]) => plan && !containsUnsafeContent(plan.guestLine),
      ),
    ) as Save["adaptations"];
    const adaptiveMoments = Object.fromEntries(
      Object.entries(s.adaptiveMoments ?? {}).filter(
        ([, moment]) =>
          moment &&
          !containsUnsafeContent(moment.line) &&
          !containsUnsafeContent(moment.groundedIn),
      ),
    ) as Save["adaptiveMoments"];
    return {
      ...s,
      name: sanitizeName(s.name) || "Little one",
      ...(s.favFood ? { favFood: safePlayerText(s.favFood, "your favourite dinner") } : {}),
      ...(s.favToy ? { favToy: safePlayerText(s.favToy, "your favourite toy") } : {}),
      favToyAssetKey: blockedToy ? undefined : s.favToyAssetKey,
      adaptations,
      adaptiveMoments,
      facts: {
        ...s.facts,
        choiceTrail: Array.isArray(s.facts.choiceTrail)
          ? s.facts.choiceTrail
              .filter(
                (choice): choice is string =>
                  typeof choice === "string" && !containsUnsafeContent(choice),
              )
              .slice(-12)
          : [],
      },
    };
  } catch {
    return null;
  }
}

const MEM_KEY = "mwbb-memory-v1";
export type Memory = {
  runs: number;
  lastName?: string;
  lastToy?: ToyId;
  lastEnding?: "composed" | "crying";
  /** The player asked the house to forget them; data is kept but hidden. */
  forgotten?: boolean;
};
function readRawMemory(): Memory {
  if (typeof window === "undefined") return { runs: 0 };
  try {
    const memory = JSON.parse(localStorage.getItem(MEM_KEY) || "") as Memory;
    return { ...memory, runs: memory.runs || 0 };
  } catch {
    return { runs: 0 };
  }
}
/** Full persisted memory for internal updates, even while the player has hidden it. */
export function loadStoredMemory(): Memory {
  const memory = readRawMemory();
  return {
    ...memory,
    ...(memory.lastName ? { lastName: sanitizeName(memory.lastName) || "Little one" } : {}),
  };
}
export function loadMemory(): Memory {
  const memory = loadStoredMemory();
  if (memory.forgotten) return { runs: 0, forgotten: true };
  return memory;
}
export function saveMemory(m: Memory) {
  try {
    localStorage.setItem(
      MEM_KEY,
      JSON.stringify({
        ...m,
        ...(m.lastName ? { lastName: sanitizeName(m.lastName) || "Little one" } : {}),
      }),
    );
  } catch {
    /* ignore */
  }
}
/** Toggle whether the house recognises the player. Returns the visible memory. */
export function setMemoryForgotten(forgotten: boolean): Memory {
  const raw = readRawMemory();
  const next: Memory = { ...raw };
  if (forgotten) next.forgotten = true;
  else delete next.forgotten;
  saveMemory(next);
  return loadMemory();
}
export function forgetMemory() {
  setMemoryForgotten(true);
}

export function sanitizeName(raw: string): string {
  const clean = raw
    .replace(/[^\p{L}\s'-]/gu, "")
    .trim()
    .slice(0, 14);
  if (!clean || containsUnsafeContent(clean)) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
if (typeof window !== "undefined" && import.meta.env.DEV)
  (window as unknown as { __game: typeof useGame }).__game = useGame;
