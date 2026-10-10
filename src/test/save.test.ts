import { beforeEach, describe, expect, it } from "vitest";
import { loadSave, useGame } from "@/game/store";

describe("chapter checkpoint save", () => {
  beforeEach(() => {
    localStorage.clear();
    useGame.getState().newRun();
  });

  it("saves when a chapter starts and resumes there with the same run", () => {
    const s = useGame.getState();
    const order = s.toyOrder;
    s.set({ name: "Lucia", favColor: "sage", favFood: "pancakes", cordura: 30, ch1: [...order] });
    s.go("ch3");
    s.go("title"); // quitting to the menu keeps the save

    useGame.setState({ name: "", favFood: undefined, cordura: 0, ch1: [] });
    expect(s.continueRun()).toBe(true);
    const r = useGame.getState();
    expect(r.screen).toBe("ch3");
    expect(r.name).toBe("Lucia");
    expect(r.favColor).toBe("sage");
    expect(r.favFood).toBe("pancakes");
    expect(r.cordura).toBe(30);
    expect(r.toyOrder).toEqual(order);
    expect(r.ch1).toEqual(order);
  });

  it("a new game wipes the old save", () => {
    const s = useGame.getState();
    s.set({ name: "Lucia" });
    s.go("ch2k");
    expect(loadSave()?.screen).toBe("ch2k");
    s.newRun();
    expect(loadSave()).toBeNull();
  });

  it("clears the save once the run reaches the ending", () => {
    const s = useGame.getState();
    s.set({ name: "Lucia" });
    s.go("ch5");
    expect(loadSave()?.screen).toBe("ch5");
    s.go("final");
    expect(loadSave()).toBeNull();
    expect(s.continueRun()).toBe(false);
  });

  it("ignores corrupt or foreign saves", () => {
    localStorage.setItem("mwbb-save-v1", "{not json");
    expect(loadSave()).toBeNull();
    localStorage.setItem("mwbb-save-v1", JSON.stringify({ screen: "ending", name: "x" }));
    expect(loadSave()).toBeNull();
  });

  it("changing screen always unpauses", () => {
    const s = useGame.getState();
    s.set({ name: "Lucia", paused: true });
    s.go("ch2k");
    expect(useGame.getState().paused).toBe(false);
  });

  it("keeps behavioural memory bounded and records recovery", () => {
    const s = useGame.getState();
    s.mistake();
    s.mistake();
    s.success(8_500);
    for (let i = 0; i < 15; i++) s.observeChoice(`choice ${i}`);
    s.say([
      { speaker: "narrator", text: "one" },
      { speaker: "narrator", text: "two" },
    ]);
    s.nextLine(true);

    const facts = useGame.getState().facts;
    expect(facts).toMatchObject({
      mistakes: 2,
      maxMistakeStreak: 2,
      currentMistakeStreak: 0,
      recoveries: 1,
      completedCheckpoints: 1,
      fastCompletions: 1,
      dialogueSkips: 1,
    });
    expect(facts.responseTimesMs).toEqual([8_500]);
    expect(facts.choiceTrail).toHaveLength(12);
    expect(facts.choiceTrail[0]).toBe("choice 3");
  });

  it("fills new behavioural defaults when resuming an older save", () => {
    const s = useGame.getState();
    s.set({ name: "Lucia" });
    s.go("ch3");
    const oldSave = JSON.parse(localStorage.getItem("mwbb-save-v1")!) as {
      facts: Record<string, unknown>;
    };
    delete oldSave.facts["dialogueSkips"];
    delete oldSave.facts["choiceTrail"];
    localStorage.setItem("mwbb-save-v1", JSON.stringify(oldSave));

    expect(s.continueRun()).toBe(true);
    expect(useGame.getState().facts.dialogueSkips).toBe(0);
    expect(useGame.getState().facts.choiceTrail).toEqual([]);
  });
});
