import { describe, expect, it } from "vitest";
import { favoriteToyAssetKey } from "./toy-image-cache";

describe("generated toy cache key", () => {
  it("is stable across harmless casing and Unicode differences", () => {
    expect(favoriteToyAssetKey("  Formula One Car ")).toBe(favoriteToyAssetKey("formula one car"));
  });

  it("separates different requested toys", () => {
    expect(favoriteToyAssetKey("Formula One car")).not.toBe(favoriteToyAssetKey("toy dinosaur"));
  });
});
