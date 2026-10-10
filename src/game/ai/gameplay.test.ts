import { describe, expect, it } from "vitest";
import {
  adaptiveBlackoutProbability,
  adaptiveMusicRoundLength,
  adaptivePajamaWall,
  pajamaCleanupGoal,
  shiftedDifficulty,
} from "./gameplay";

describe("adaptive gameplay controls", () => {
  it("makes every music-box difficulty mechanically distinct", () => {
    expect([0, 1, 2, 3].map((round) => adaptiveMusicRoundLength("gentle", round))).toEqual([
      3, 3, 4, 5,
    ]);
    expect([0, 1, 2, 3].map((round) => adaptiveMusicRoundLength("standard", round))).toEqual([
      3, 4, 5, 7,
    ]);
    expect([0, 1, 2, 3].map((round) => adaptiveMusicRoundLength("relentless", round))).toEqual([
      4, 5, 6, 8,
    ]);
  });

  it("applies realtime easing and escalation within safe bounds", () => {
    expect(shiftedDifficulty("standard", "ease")).toBe("gentle");
    expect(shiftedDifficulty("standard", "escalate")).toBe("relentless");
    expect(shiftedDifficulty("gentle", "ease")).toBe("gentle");
    expect(shiftedDifficulty("relentless", "escalate")).toBe("relentless");
  });

  it("changes the amount of bedtime cleanup without making it impossible", () => {
    expect(pajamaCleanupGoal("gentle")).toBe(3);
    expect(pajamaCleanupGoal("standard")).toBe(6);
    expect(pajamaCleanupGoal("relentless")).toBe(9);
  });

  it("moves pajamas and raises blackout pressure across validated variants", () => {
    expect(adaptivePajamaWall(1, "garden")).toBe(1);
    expect(adaptivePajamaWall(1, "keepsake")).toBe(2);
    expect(adaptivePajamaWall(3, "night")).toBe(1);
    expect(adaptiveBlackoutProbability("merciful")).toBeLessThan(
      adaptiveBlackoutProbability("watchful"),
    );
    expect(adaptiveBlackoutProbability("watchful")).toBeLessThan(
      adaptiveBlackoutProbability("relentless"),
    );
  });
});
