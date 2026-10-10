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
