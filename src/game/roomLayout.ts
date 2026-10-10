/** Four-wall layout shared by the room puzzles (0 front, 1 right, 2 back, 3 left). */
export type WallNumber = 0 | 1 | 2 | 3;
export type Spot = Readonly<{ wall: WallNumber; x: number; y: number }>;

/** One toy on front/right/left and two on the back wall with the door and jacket. */
export const PLAYROOM_TOYS: readonly Spot[] = [
  { wall: 0, x: 42, y: 66 },
  { wall: 3, x: 63, y: 66 },
  { wall: 1, x: 75, y: 69 },
  { wall: 2, x: 36, y: 50 },
  { wall: 2, x: 59, y: 82 },
];
/** Start a short, bounded walk away from overlays and navigation controls, on the pickup wall. */
export const FIRST_TOY_WALKS: readonly Spot[] = [
  { wall: 0, x: 40, y: 82 },
  { wall: 1, x: 40, y: 82 },
  { wall: 2, x: 40, y: 82 },
  { wall: 3, x: 40, y: 82 },
];

/** Two cupboards front, one each on right/back/left. */
export const KITCHEN_WALLS: readonly WallNumber[] = [0, 1, 2, 3, 0];

/** Stagger every outfit color across walls so all three correct pieces are never in one view. */
export function pajamaWall(kindIndex: number, colorIndex: number): WallNumber {
  return ((kindIndex + colorIndex) % 4) as WallNumber;
}

