const CACHE_NAME = "mwbb-generated-toys-v1";
const CACHE_PATH = "/__mwbb_generated_toy__/";

export function favoriteToyAssetKey(description: string): string {
  const normalized = description.normalize("NFKC").trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(36)}`;
}

function requestFor(key: string) {
  return new Request(new URL(`${CACHE_PATH}${encodeURIComponent(key)}`, window.location.origin));
}

export async function cacheFavoriteToyAsset(key: string, dataUrl: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const source = await fetch(dataUrl);
    const blob = await source.blob();
    if (!blob.type.startsWith("image/") || blob.size > 4_200_000) return;
    const cache = await window.caches.open(CACHE_NAME);
    await cache.put(
      requestFor(key),
      new Response(blob, {
        headers: { "Content-Type": blob.type, "Cache-Control": "max-age=31536000" },
      }),
    );
  } catch {
    // Generated art is an enhancement; a static prop remains available.
  }
}

export async function loadFavoriteToyAsset(key: string): Promise<string | undefined> {
  if (typeof window === "undefined" || !("caches" in window)) return undefined;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const response = await cache.match(requestFor(key));
    if (!response) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > 4_200_000) return undefined;
    return URL.createObjectURL(blob);
  } catch {
    return undefined;
  }
}
