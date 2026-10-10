import { generateFavoriteToyImageAI } from "./toy-image.functions";
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
  const cached = await loadFavoriteToyAsset(key);
  if (cached) return { key, imageUrl: cached };
  try {
    const result = await Promise.race([
      generateFavoriteToyImageAI({ data: { description } }),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Toy image generation timed out")), 25_000),
      ),
    ]);
    await cacheFavoriteToyAsset(key, result.dataUrl);
    return { key, imageUrl: result.dataUrl };
  } catch {
    return undefined;
  }
}

export async function restoreFavoriteToyImage(key: string): Promise<string | undefined> {
  return loadFavoriteToyAsset(key);
}
