import { describe, expect, it } from "vitest";
import type { RealtimeContext } from "./contracts";
import { offlineRealtimeDecision } from "./realtime";

const base: RealtimeContext = {
  chapter: 3,
  checkpoint: "round-1",
  event: "round_complete",
  cordura: 25,
  favColor: "rose",
  favFood: "pancakes",
  favToy: "wooden train",
  firstToy: "felt rabbit",
  facts: {
    mistakes: 0,
    darkSeconds: 8,
    lightToggles: 2,
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
  recent: { recentMistakes: 0, round: 1, elapsedMs: 8_000 },
  previousLines: [],
};

describe("offline realtime director", () => {
  it("escalates after a quick clean round and names that round", () => {
    const decision = offlineRealtimeDecision(base);
    expect(decision.action).toBe("escalate");
    expect(decision.line.toLowerCase()).toContain("round 1");
    expect(decision.groundedIn).toBe("round 1");
  });

  it("eases after repeated mistakes and states the observed count", () => {
    const decision = offlineRealtimeDecision({
      ...base,
      event: "mistake_streak",
      recent: { recentMistakes: 3 },
    });
    expect(decision.action).toBe("ease");
    expect(decision.line).toContain("3 mistakes");
  });

  it("reflects free-text preferences and the player's searched location", () => {
    const tasks = offlineRealtimeDecision({
      ...base,
      chapter: 5,
      event: "tasks_complete",
      recent: { recentMistakes: 0 },
    });
    const miss = offlineRealtimeDecision({
      ...base,
      chapter: 5,
      event: "search_miss",
      recent: { recentMistakes: 1, choice: "the bathtub" },
    });
    expect(tasks.line).toContain("pancakes");
    expect(tasks.line).toContain("wooden train");
    expect(miss.line).toContain("the bathtub");
  });

  it("reacts to accumulated behavioural signals", () => {
    const helped = offlineRealtimeDecision({
      ...base,
      chapter: 4,
      event: "puzzle_solved",
      facts: { ...base.facts, hintsUsed: 2 },
      recent: { recentMistakes: 0 },
    });
    const skipped = offlineRealtimeDecision({
      ...base,
      chapter: 5,
      event: "tasks_complete",
      facts: { ...base.facts, dialogueSkips: 4 },
      recent: { recentMistakes: 0 },
    });
    expect(helped.action).toBe("hold");
    expect(helped.line).toContain("2 hints");
    expect(skipped.line).toContain("4 skipped lines");
  });
});
