import type { FoodCategory, FoodInterpretation } from "./contracts";
import { interpretFavoriteFoodAI } from "./guest.functions";

const CATEGORY_LABEL: Record<FoodCategory, string> = {
  fruit: "strawberries",
  pancakes: "pancakes",
  pasta: "spaghetti",
  soup: "tomato soup",
  cake: "chocolate cake",
  fish: "fish fingers",
  other: "your favourite dinner",
};

const MATCHERS: Array<[FoodCategory, RegExp]> = [
  ["fruit", /\b(fruit|strawberr|berry|berries|fresa|fruta|manzana|apple|banana)\w*/iu],
  ["pancakes", /\b(pancake|crepe|waffle|tortita)\w*/iu],
  ["pasta", /\b(pasta|spaghetti|macaroni|macarron|noodle|lasagna|lasaña)\w*/iu],
  ["soup", /\b(soup|sopa|caldo)\w*/iu],
  ["cake", /\b(cake|tarta|pastel|chocolate|brownie)\w*/iu],
  ["fish", /\b(fish|pescado|sushi|salmon|salmón)\w*/iu],
];

export function offlineFoodInterpretation(answer: string): FoodInterpretation {
  const normalized = answer.normalize("NFKC").toLowerCase().slice(0, 80);
  const category = MATCHERS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? "other";
  const displayFood = CATEGORY_LABEL[category];
  const opening = displayFood.charAt(0).toUpperCase() + displayFood.slice(1);
  return {
    category,
    displayFood,
    monsterLine: `${opening}. I'll remember.`,
    fallbackUsed: true,
    provider: "offline",
  };
}

export async function interpretFavoriteFood(answer: string): Promise<FoodInterpretation> {
  const fallback = offlineFoodInterpretation(answer);
  try {
    return await Promise.race([
      interpretFavoriteFoodAI({ data: { answer } }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Preference interpreter timed out")), 6_000),
      ),
    ]);
  } catch {
    return fallback;
  }
}
