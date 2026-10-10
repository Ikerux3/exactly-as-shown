import type { ToyCategory, ToyInterpretation } from "./contracts";
import { interpretFavoriteToyAI } from "./guest.functions";

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
  ["train", /\b(train|tren|car|coche|vehicle|vehiculo|vehículo)\w*/iu],
  ["doll", /\b(doll|muñeca|muneca|puppet|marioneta)\w*/iu],
  ["elephant", /\b(elephant|elefante)\w*/iu],
];

export function offlineToyInterpretation(answer: string): ToyInterpretation {
  const normalized = answer.normalize("NFKC").toLowerCase().slice(0, 80);
  const category = MATCHERS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? "other";
  const displayToy = TOY_LABEL[category];
  const opening = displayToy.charAt(0).toUpperCase() + displayToy.slice(1);
  return {
    category,
    displayToy,
    monsterLine: `${opening}. I know which one you mean.`,
    fallbackUsed: true,
    provider: "offline",
  };
}

export async function interpretFavoriteToy(answer: string): Promise<ToyInterpretation> {
  const fallback = offlineToyInterpretation(answer);
  try {
    return await Promise.race([
      interpretFavoriteToyAI({ data: { answer } }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Preference interpreter timed out")), 6_000),
      ),
    ]);
  } catch {
    return fallback;
  }
}
