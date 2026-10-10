import { describe, expect, it } from "vitest";
import { KITCHEN_WALLS, TOY_ESCAPE_SPOTS, pajamaWall } from "./roomLayout";

describe("four-wall puzzles - desktop and touch parity", () => {
  it("distributes five toys across all four walls with non-overlapping landing spots", () => {
    expect(TOY_ESCAPE_SPOTS).toHaveLength(5);
    expect(new Set(TOY_ESCAPE_SPOTS.map((s) => s.wall))).toEqual(new Set([0, 1, 2, 3]));
    for (let i = 0; i < TOY_ESCAPE_SPOTS.length; i++) {
      const a = TOY_ESCAPE_SPOTS[i]!;
      expect(a.x).toBeGreaterThan(10);
      expect(a.x).toBeLessThan(90);
      expect(a.y).toBeGreaterThan(35);
      expect(a.y).toBeLessThan(90);
      for (let j = i + 1; j < TOY_ESCAPE_SPOTS.length; j++) {
        const b = TOY_ESCAPE_SPOTS[j]!;
        if (a.wall !== b.wall) continue;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(25);
      }
    }
  });

  it("places kitchen cupboards across front, right, back and left", () => {
    expect(KITCHEN_WALLS).toHaveLength(5);
    expect(new Set(KITCHEN_WALLS)).toEqual(new Set([0, 1, 2, 3]));
  });

  it("separates all three correct pajama pieces regardless of favorite color", () => {
    for (let color = 0; color < 4; color++) {
      const walls = [0, 1, 2].map((kind) => pajamaWall(kind, color));
      expect(new Set(walls).size).toBe(3);
      expect(walls.every((wall) => wall >= 0 && wall <= 3)).toBe(true);
    }
  });
});
