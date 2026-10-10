import { generateFavoriteToyImageAI } from "./toy-image.functions";
import { preferenceToyImage } from "../assets";
import {
  cacheFavoriteToyAsset,
  favoriteToyAssetKey,
  loadFavoriteToyAsset,
} from "./toy-image-cache";

export type FavoriteToyAsset = { key: string; imageUrl: string };

export async function generateFavoriteToyImage(
  description: string,
): Promise<FavoriteToyAsset | undefined> {
  const key = favoriteToyAssetKey(description);
  const curated = preferenceToyImage(description);
  if (curated) return { key: `curated:${description}`, imageUrl: curated };
  const cached = await loadFavoriteToyAsset(key);
  if (cached) return { key, imageUrl: cached };
  try {
    const result = await Promise.race([
      generateFavoriteToyImageAI({ data: { description } }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Toy image generation timed out")), 47_000),
      ),
    ]);
    await cacheFavoriteToyAsset(key, result.dataUrl);
    return { key, imageUrl: result.dataUrl };
  } catch (error) {
    console.warn(
      "[toy-image] Custom prop generation unavailable:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return undefined;
  }
}

export async function restoreFavoriteToyImage(key: string): Promise<string | undefined> {
  if (key.startsWith("curated:")) return preferenceToyImage(key.slice(8));
  return loadFavoriteToyAsset(key);
}
