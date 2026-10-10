import { useEffect, useState } from "react";
import { useGame } from "../store";
import type { AdaptiveChapter, AdaptiveContext, AdaptivePlan } from "./contracts";
import { directAdaptiveChapterAI } from "./adapt.functions";

export function offlineAdaptivePlan(context: AdaptiveContext): AdaptivePlan {
  const struggling =
    context.facts.currentMistakeStreak >= 2 ||
    context.facts.maxMistakeStreak >= 4 ||
    context.facts.hintsUsed >= 3 ||
    context.facts.slowCompletions >= 2 ||
    context.cordura >= 70;
  const confident =
    !struggling &&
    (context.facts.fastCompletions >= 2 ||
      (context.facts.mistakes <= 1 && context.facts.darkSeconds >= 35));
  const difficulty = struggling ? "gentle" : confident ? "relentless" : "standard";
  const puzzleVariant =
    context.favColor === "turq" || context.favFood?.includes("fish")
      ? "night"
      : context.favColor === "rose" || context.favFood?.includes("cake")
        ? "keepsake"
        : "garden";
  const hidingPlace =
    context.facts.lightToggles > 12
      ? "towel"
      : context.favToy?.includes("doll")
        ? "laundry"
        : "bath";
  const blackoutPressure = struggling
    ? "merciful"
    : context.facts.lightToggles > 10
      ? "relentless"
      : "watchful";
  const remembered = context.favToy ?? context.favFood ?? "what you chose";
  return {
    difficulty,
    puzzleVariant,
    hidingPlace,
    blackoutPressure,
    guestLine: `I remembered ${remembered}. I moved things to suit you.`,
    fallbackUsed: true,
    provider: "offline",
  };
}

function currentContext(chapter: AdaptiveChapter): AdaptiveContext {
  const state = useGame.getState();
  return {
    chapter,
    cordura: state.cordura,
    favColor: state.favColor,
    ...(state.favFood ? { favFood: state.favFood } : {}),
    ...(state.favToy ? { favToy: state.favToy } : {}),
    facts: { ...state.facts },
  };
}

export async function adaptChapter(context: AdaptiveContext): Promise<AdaptivePlan> {
  const fallback = offlineAdaptivePlan(context);
  try {
    return await Promise.race([
      directAdaptiveChapterAI({ data: context }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Adaptive director timed out")), 6_000),
      ),
    ]);
  } catch {
    return fallback;
  }
}

export function useAdaptiveChapter(chapter: AdaptiveChapter): AdaptivePlan {
  const saved = useGame.getState().adaptations[chapter];
  const [plan, setPlan] = useState<AdaptivePlan>(
    () => saved ?? offlineAdaptivePlan(currentContext(chapter)),
  );

  useEffect(() => {
    if (saved) return;
    let active = true;
    void adaptChapter(currentContext(chapter)).then((next) => {
      if (!active) return;
      setPlan(next);
      const state = useGame.getState();
      state.set({ adaptations: { ...state.adaptations, [chapter]: next } });
    });
    return () => {
      active = false;
    };
  }, [chapter, saved]);

  return plan;
}
