import { describe, expect, it } from "vitest";
import type { AdaptiveQuestionContext } from "./contracts";
import { offlineAdaptiveQuestion } from "./questions";

const base: AdaptiveQuestionContext = {
  kind: "food",
  name: "Lucia",
  favColor: "Rose",
  favToy: "Formula One car",
  previousRuns: 0,
  mistakes: 0,
  lightToggles: 0,
  dialogueSkips: 0,
  choiceTrail: [],
  previousQuestions: [],
};

describe("adaptive question fallback", () => {
  it("changes wording when player behaviour changes", () => {
    const first = offlineAdaptiveQuestion(base);
    const changed = offlineAdaptiveQuestion({
      ...base,
      mistakes: 1,
      lightToggles: 2,
      choiceTrail: ["Mommy's plate"],
    });
    expect(changed.text).not.toBe(first.text);
  });

  it("grounds later questions in remembered preferences or actions", () => {
    const toyQuestion = offlineAdaptiveQuestion({ ...base, kind: "toy" });
    const foodQuestion = offlineAdaptiveQuestion({ ...base, lightToggles: 1 });
    expect(toyQuestion.text).toContain("Rose");
    expect(foodQuestion.text).toContain("Formula One car");
  });

  it("varies the opening across remembered runs", () => {
    const first = offlineAdaptiveQuestion({ ...base, kind: "name" });
    const later = offlineAdaptiveQuestion({ ...base, kind: "name", previousRuns: 1 });
    expect(later.text).not.toBe(first.text);
    expect(later.text).toMatch(/visit 2/i);
  });
});
