import { describe, expect, it } from "vitest";
import { harmonicMode, harmonyPedal, melodySemitone } from "./audio";

describe("adaptive music harmony", () => {
  it("moves from C major through relative A minor into C minor", () => {
    expect(harmonicMode(0)).toBe("c-major");
    expect(harmonicMode(29)).toBe("c-major");
    expect(harmonicMode(30)).toBe("a-minor");
    expect(harmonicMode(59)).toBe("a-minor");
    expect(harmonicMode(60)).toBe("c-minor");
    expect(harmonicMode(84)).toBe("c-minor");
    expect(harmonicMode(85)).toBe("fractured");
  });

  it("changes the pedal from C to A and back to C", () => {
    expect(harmonyPedal(10)).toBeCloseTo(130.81);
    expect(harmonyPedal(40)).toBe(110);
    expect(harmonyPedal(70)).toBeCloseTo(130.81);
  });

  it("introduces the C minor notes in stages and reserves the tritone for maximum tension", () => {
    expect(melodySemitone(11, 59, 0)).toBe(11);
    expect(melodySemitone(11, 60, 0)).toBe(10);
    expect(melodySemitone(4, 67, 0)).toBe(4);
    expect(melodySemitone(4, 68, 0)).toBe(3);
    expect(melodySemitone(9, 76, 0)).toBe(8);
    expect(melodySemitone(7, 85, 0)).toBe(6);
    expect(melodySemitone(7, 85, 1)).toBe(7);
  });
});
