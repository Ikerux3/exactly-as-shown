/** MJ v3.1 deterministic rules shared by desktop and touch gameplay. */
export const GAMEPLAY_RULES = {
  darkPerSecond: 3,
  litSecondsPerPoint: 2,
  fullScarePoints: 10,
  retryCordura: 50,
  errorBlackoutSeconds: 3,
  finalBlackoutSeconds: 6,
  finalBonusPoints: 5,
  cryingFrom: 65,
} as const;

export function clampCordura(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** The scripted final bonus is applied exactly once, even on remount. */
export function applyFinalCordura(current: number, alreadyFrozen?: number): number {
  return alreadyFrozen === undefined
    ? clampCordura(current + GAMEPLAY_RULES.finalBonusPoints)
    : clampCordura(alreadyFrozen);
}

/** Table is one minigame spanning kitchen + dining. Reset it at the kitchen. */
export function checkpointScreen(screen: string): string {
  return screen === "ch2d" ? "ch2k" : screen;
}

export function wrongTableBlackoutPenalty(): number {
  return GAMEPLAY_RULES.errorBlackoutSeconds * GAMEPLAY_RULES.darkPerSecond;
}
