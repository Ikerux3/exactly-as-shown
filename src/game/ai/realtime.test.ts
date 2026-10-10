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
  facts: { mistakes: 0, darkSeconds: 8, lightToggles: 2, revisits: 0, previousRuns: 0 },
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
});
