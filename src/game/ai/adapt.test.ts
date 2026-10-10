import { describe, expect, it } from "vitest";
import { offlineAdaptivePlan } from "./adapt";

const base = {
  chapter: 3 as const,
  cordura: 20,
  favColor: "sage" as const,
  favFood: "spaghetti",
  favToy: "teddy bear",
  facts: {
    mistakes: 2,
    darkSeconds: 20,
    lightToggles: 5,
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
};

describe("offline adaptive director", () => {
  it("reduces difficulty for a struggling player", () => {
    const plan = offlineAdaptivePlan({
      ...base,
      cordura: 80,
      facts: { ...base.facts, mistakes: 5 },
    });
    expect(plan.difficulty).toBe("gentle");
    expect(plan.blackoutPressure).toBe("merciful");
  });

  it("changes later mechanics from preferences and behaviour", () => {
    const plan = offlineAdaptivePlan({
      ...base,
      favColor: "turq",
      facts: { ...base.facts, mistakes: 0, darkSeconds: 50, lightToggles: 14 },
    });
    expect(plan).toMatchObject({
      difficulty: "relentless",
      puzzleVariant: "night",
      hidingPlace: "towel",
      blackoutPressure: "relentless",
    });
  });

  it("uses timing, hints and mistake streaks as difficulty signals", () => {
    expect(
      offlineAdaptivePlan({
        ...base,
        facts: { ...base.facts, fastCompletions: 2 },
      }).difficulty,
    ).toBe("relentless");
    expect(
      offlineAdaptivePlan({
        ...base,
        facts: { ...base.facts, hintsUsed: 3, fastCompletions: 4 },
      }).difficulty,
    ).toBe("gentle");
  });
});
