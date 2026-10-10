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
  };
};
