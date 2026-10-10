import type { ToyCategory, ToyInterpretation } from "./contracts";
import { interpretFavoriteToyAI } from "./guest.functions";
import { containsPromptControl, containsUnsafeContent } from "../safety";

const TOY_LABEL: Record<ToyCategory, string> = {
  bear: "teddy bear",
  rabbit: "felt rabbit",
  train: "wooden train",
  doll: "rag doll",
  elephant: "knitted elephant",
  other: "your favourite toy",
};

const MATCHERS: Array<[ToyCategory, RegExp]> = [
  ["bear", /\b(bear|teddy|oso|peluche)\w*/iu],
  ["rabbit", /\b(rabbit|bunny|conejo)\w*/iu],
  ["train", /\b(train|tren|locomotive|locomotora)\w*/iu],
  ["doll", /\b(doll|muñeca|muneca|puppet|marioneta)\w*/iu],
  ["elephant", /\b(elephant|elefante)\w*/iu],
];

const CUSTOM_MATCHERS: Array<[string, RegExp]> = [
  ["Formula One car", /\b(f1|formula\s*(?:one|1)|formula uno)\b/iu],
  ["toy racing car", /\b(race\s*car|racing\s*car|coche\s+de\s+carreras)\b/iu],
  ["toy car", /\b(car|coche|carrito|vehicle|veh[ií]culo)\b/iu],
  ["toy dinosaur", /\b(dinosaur|dino|dinosaurio)\w*/iu],
  ["toy robot", /\b(robot)\w*/iu],
  ["toy spaceship", /\b(spaceship|rocket|nave\s+espacial|cohete)\w*/iu],
  ["toy ball", /\b(ball|pelota|bal[oó]n)\b/iu],
];

function customToyLabel(answer: string): string | undefined {
  const clean = answer.normalize("NFKC").trim().replace(/\s+/gu, " ").slice(0, 40);
  if (
    clean.length < 2 ||
    clean.split(/\s+/u).length > 4 ||
    !/^[\p{L}\p{N}][\p{L}\p{N}\s'’&-]*$/u.test(clean) ||
    containsPromptControl(clean)
  ) return undefined;
  return clean;
}

export function offlineToyInterpretation(answer: string): ToyInterpretation {
  const normalized = answer.normalize("NFKC").toLowerCase().slice(0, 80);
  if (containsUnsafeContent(normalized)) {
    return {
      category: "other",
      displayToy: TOY_LABEL.other,
      monsterLine: "Let's choose a different toy.",
      customVisual: false,
      fallbackUsed: true,
      provider: "offline",
    };
  }
  const category = MATCHERS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? "other";
  const customDisplay = CUSTOM_MATCHERS.find(([, pattern]) => pattern.test(normalized))?.[0];
  const safeCustomDisplay = category === "other" ? (customDisplay ?? customToyLabel(answer)) : undefined;
  const displayToy =
    category === "other" ? (safeCustomDisplay ?? TOY_LABEL.other) : TOY_LABEL[category];
  const opening = displayToy.charAt(0).toUpperCase() + displayToy.slice(1);
  return {
    category,
    displayToy,
    monsterLine: `${opening}. I know which one you mean.`,
    customVisual: !!safeCustomDisplay,
    fallbackUsed: true,
    provider: "offline",
  };
}

export async function interpretFavoriteToy(answer: string): Promise<ToyInterpretation> {
  const fallback = offlineToyInterpretation(answer);
  if (containsUnsafeContent(answer)) return fallback;
  try {
    const interpreted = await Promise.race([
      interpretFavoriteToyAI({ data: { answer } }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Preference interpreter timed out")), 6_000),
      ),
    ]);
    // A concise, safe concrete answer must still receive a custom prop when the
    // model is overly conservative and labels it as generic/nonsense.
    if (fallback.customVisual && interpreted.category === "other" && !interpreted.customVisual) {
      return {
        ...fallback,
        monsterLine: interpreted.monsterLine,
        fallbackUsed: interpreted.fallbackUsed,
        provider: interpreted.provider,
      };
    }
    return interpreted;
  } catch {
    return fallback;
  }
}
