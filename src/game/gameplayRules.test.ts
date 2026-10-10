import { describe, expect, it } from "vitest";
import {
  GAMEPLAY_RULES,
  applyFinalCordura,
  checkpointScreen,
  clampCordura,
  wrongTableBlackoutPenalty,
} from "./gameplayRules";

describe("El Invitado / MJ v3.1 rules shared by PC and mobile", () => {
  it("applies +3 each dark second and recovers 1 every two lit seconds", () => {
    expect(GAMEPLAY_RULES.darkPerSecond).toBe(3);
    expect(GAMEPLAY_RULES.litSecondsPerPoint).toBe(2);
    expect(GAMEPLAY_RULES.fullScarePoints).toBe(10);
    expect(clampCordura(0)).toBe(0);
    expect(clampCordura(300)).toBe(100);
    expect(GAMEPLAY_RULES.darkPerSecond * 10).toBe(30);
  });

  it("forces exactly +9 for a three-second wrong table placement", () => {
    expect(GAMEPLAY_RULES.errorBlackoutSeconds).toBe(3);
    expect(wrongTableBlackoutPenalty()).toBe(9);
  });

  it("resets 100% Cordura to 50 at the start of the active chapter", () => {
    expect(GAMEPLAY_RULES.retryCordura).toBe(50);
    expect(checkpointScreen("ch1")).toBe("ch1");
    expect(checkpointScreen("ch2d")).toBe("ch2k");
    expect(checkpointScreen("ch3")).toBe("ch3");
    expect(checkpointScreen("ch4")).toBe("ch4");
    expect(checkpointScreen("ch5")).toBe("ch5");
  });

  it("adds +5 total to the final six-second darkness only once", () => {
    expect(GAMEPLAY_RULES.finalBlackoutSeconds).toBe(6);
    expect(GAMEPLAY_RULES.finalBonusPoints).toBe(5);
    expect(applyFinalCordura(59)).toBe(64);
    expect(applyFinalCordura(60)).toBe(65);
    expect(applyFinalCordura(95)).toBe(100);
    expect(applyFinalCordura(99)).toBe(100);
    expect(applyFinalCordura(95, 100)).toBe(100); // strict-mode remount does not add again
    expect(GAMEPLAY_RULES.cryingFrom).toBe(65);
  });
});
