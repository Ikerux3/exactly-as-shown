import type { AdaptivePlan, RealtimeAction } from "./contracts";

const DIFFICULTIES: AdaptivePlan["difficulty"][] = ["gentle", "standard", "relentless"];

const MUSIC_ROUND_LENGTHS: Record<AdaptivePlan["difficulty"], readonly number[]> = {
  gentle: [3, 3, 4, 5],
  standard: [3, 4, 5, 7],
  relentless: [4, 5, 6, 8],
};

export function shiftedDifficulty(
  base: AdaptivePlan["difficulty"],
  action: RealtimeAction,
): AdaptivePlan["difficulty"] {
  const index = DIFFICULTIES.indexOf(base);
  const shift = action === "ease" ? -1 : action === "escalate" ? 1 : 0;
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, index + shift))]!;
}

export function adaptiveMusicRoundLength(
  difficulty: AdaptivePlan["difficulty"],
  round: number,
): number {
  const lengths = MUSIC_ROUND_LENGTHS[difficulty];
  return lengths[Math.max(0, Math.min(lengths.length - 1, round))]!;
}

export function pajamaCleanupGoal(difficulty: AdaptivePlan["difficulty"]): number {
  return difficulty === "gentle" ? 3 : difficulty === "relentless" ? 9 : 6;
}

export function adaptivePajamaWall(
  baseWall: number,
  variant: AdaptivePlan["puzzleVariant"],
): number {
  const shift = variant === "garden" ? 0 : variant === "keepsake" ? 1 : 2;
  return (baseWall + shift) % 4;
}

export function adaptiveBlackoutProbability(
  pressure: AdaptivePlan["blackoutPressure"],
): number {
  return pressure === "merciful" ? 0.12 : pressure === "relentless" ? 0.45 : 0.28;
}
