import { describe, expect, it } from "vitest";
import { offlineAdaptivePlan } from "./adapt";

const base = {
  chapter: 3 as const,
  cordura: 20,
  favColor: "sage" as const,
  favFood: "spaghetti",
  favToy: "teddy bear",
  facts: { mistakes: 2, darkSeconds: 20, lightToggles: 5, revisits: 0, previousRuns: 0 },
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
});
