/** Four-wall layout shared by the room puzzles (0 front, 1 right, 2 back, 3 left). */
export type WallNumber = 0 | 1 | 2 | 3;
export type Spot = Readonly<{ wall: WallNumber; x: number; y: number }>;

/** Expelled toys deliberately land away from the toy box and from one another. */
export const TOY_ESCAPE_SPOTS: readonly Spot[] = [
  { wall: 0, x: 26, y: 59 },
  { wall: 1, x: 27, y: 73 },
  { wall: 2, x: 68, y: 61 },
  { wall: 3, x: 62, y: 68 },
  { wall: 0, x: 80, y: 64 },
];

/** Two cupboards front, one each on right/back/left. */
export const KITCHEN_WALLS: readonly WallNumber[] = [0, 1, 2, 3, 0];

/** Stagger every outfit color across walls so all three correct pieces are never in one view. */
export function pajamaWall(kindIndex: number, colorIndex: number): WallNumber {
  return ((kindIndex + colorIndex) % 4) as WallNumber;
}

/** Wall turns alone can trigger a single fourth-toy escape; light toggles never do. */
export function shouldReleaseFourthToy(
  storedCount: number,
  alreadyEscaped: boolean,
  playerCanInteract: boolean,
): boolean {
  return playerCanInteract && !alreadyEscaped && storedCount >= 4;
}

/** Landing spots are on the newly entered wall and avoid the navigation arrows. */
export const FOURTH_TOY_LANDINGS: readonly Spot[] = [
  { wall: 0, x: 28, y: 60 },
  { wall: 1, x: 65, y: 67 },
  { wall: 2, x: 57, y: 62 },
  { wall: 3, x: 29, y: 68 },
];
