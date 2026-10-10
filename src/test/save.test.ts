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
});
