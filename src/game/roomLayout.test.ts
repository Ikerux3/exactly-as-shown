import { describe, expect, it } from "vitest";
import { FIRST_TOY_WALKS, PLAYROOM_TOYS, KITCHEN_WALLS, pajamaWall } from "./roomLayout";
describe("four-wall puzzles", () => {
  it("places five toys on all walls with two on the door/jacket wall", () => {
    expect(PLAYROOM_TOYS).toHaveLength(5);
    expect(PLAYROOM_TOYS.map((s) => s.wall).sort()).toEqual([0, 1, 2, 2, 3]);
    const door = PLAYROOM_TOYS.filter((s) => s.wall === 2);
    expect(Math.hypot(door[0]!.x - door[1]!.x, door[0]!.y - door[1]!.y)).toBeGreaterThan(35);
  });
  it("keeps each escape on its pickup wall and walking path inside the frame", () => {
    expect(FIRST_TOY_WALKS.map((s) => s.wall)).toEqual([0, 1, 2, 3]);
    for (const s of FIRST_TOY_WALKS) {
      expect(s.x - 9).toBeGreaterThan(10);
      expect(s.x + 9 + 10).toBeLessThan(90);
      expect(s.y).toBeGreaterThan(50);
      expect(s.y).toBeLessThan(85);
    }
  });
  it("preserves other room layouts", () => {
    expect(new Set(KITCHEN_WALLS)).toEqual(new Set([0, 1, 2, 3]));
    for (let color = 0; color < 4; color++) expect(new Set([0, 1, 2].map((kind) => pajamaWall(kind, color))).size).toBe(3);
  });
});
