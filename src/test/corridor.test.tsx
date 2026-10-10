import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useGame } from "@/game/store";
import { useCorridorTransitions } from "@/game/scenes/Corridor";

describe("hall between chapters", () => {
  beforeEach(() => {
    localStorage.clear();
    useGame.getState().newRun();
    useGame.getState().set({ name: "Lucia" });
  });

  it("walks the hall when moving forward to the next chapter, holding its lines", () => {
    const { result } = renderHook(() => useCorridorTransitions());
    act(() => useGame.getState().go("ch1"));
    expect(result.current.corridor).toBeNull();

    act(() => {
      useGame.getState().go("ch2k");
      useGame.getState().say({ speaker: "narrator", text: "queued by the next chapter" });
    });
    expect(result.current.corridor).toEqual({ from: "ch1", to: "ch2k" });
    expect(useGame.getState().paused).toBe(true);
    expect(useGame.getState().line?.text).toBe("queued by the next chapter");

    act(() => result.current.endCorridor());
    expect(result.current.corridor).toBeNull();
    expect(useGame.getState().paused).toBe(false);
  });

  it("skips the hall inside a chapter, on restarts and outside the chapters", () => {
    const { result } = renderHook(() => useCorridorTransitions());
    act(() => useGame.getState().go("ch2k"));
    act(() => useGame.getState().go("ch2d")); // kitchen → dining is the same chapter
    expect(result.current.corridor).toBeNull();
    act(() => useGame.getState().go("ch2k")); // a scare sends you back to the checkpoint
    expect(result.current.corridor).toBeNull();
    act(() => useGame.getState().go("title"));
    expect(result.current.corridor).toBeNull();
    expect(result.current.veilScreen).toBe("title");
  });
});
