export const FOOD_CATEGORIES = [
  "fruit",
  "pancakes",
  "pasta",
  "soup",
  "cake",
  "fish",
  "other",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export type FoodInterpretation = {
  category: FoodCategory;
  displayFood: string;
  monsterLine: string;
  fallbackUsed: boolean;
  provider: "gemini" | "offline";
};

export const TOY_CATEGORIES = ["bear", "rabbit", "train", "doll", "elephant", "other"] as const;
export type ToyCategory = (typeof TOY_CATEGORIES)[number];

export type ToyInterpretation = {
  category: ToyCategory;
  displayToy: string;
  monsterLine: string;
  customVisual: boolean;
  fallbackUsed: boolean;
  provider: "gemini" | "offline";
};

export const ADAPTIVE_DIFFICULTIES = ["gentle", "standard", "relentless"] as const;
export const PUZZLE_VARIANTS = ["garden", "keepsake", "night"] as const;
export const HIDING_PLACES = ["bath", "laundry", "towel"] as const;
export const BLACKOUT_PRESSURES = ["merciful", "watchful", "relentless"] as const;

export type AdaptiveChapter = 3 | 4 | 5;
export type AdaptivePlan = {
  difficulty: (typeof ADAPTIVE_DIFFICULTIES)[number];
  puzzleVariant: (typeof PUZZLE_VARIANTS)[number];
  hidingPlace: (typeof HIDING_PLACES)[number];
  blackoutPressure: (typeof BLACKOUT_PRESSURES)[number];
  guestLine: string;
  fallbackUsed: boolean;
  provider: "gemini" | "offline";
};

export type AdaptiveContext = {
  chapter: AdaptiveChapter;
  cordura: number;
  favColor: "rose" | "sage" | "honey" | "turq";
  favFood?: string;
  favToy?: string;
  facts: {
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
};

export const REALTIME_EVENTS = [
  "round_complete",
  "mistake_streak",
  "puzzle_solved",
  "tasks_complete",
  "search_miss",
] as const;
export const REALTIME_ACTIONS = ["ease", "hold", "escalate"] as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[number];
export type RealtimeAction = (typeof REALTIME_ACTIONS)[number];

export type RealtimeObservation = {
  recentMistakes: number;
  round?: number;
  elapsedMs?: number;
  choice?: string;
};

export type RealtimeContext = AdaptiveContext & {
  checkpoint: string;
  event: RealtimeEvent;
  name?: string;
  firstToy?: string;
  recent: RealtimeObservation;
  previousLines: string[];
};

export type RealtimeDecision = {
  action: RealtimeAction;
  line: string;
  groundedIn: string;
  fallbackUsed: boolean;
  provider: "gemini" | "offline";
};
