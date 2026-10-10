// The player's character, made in the title menu's character creator and kept on this device.
// It only changes how the child looks (prologue, intro) and pre-fills the name; gameplay ignores it.
import { sanitizeName } from "./store";

export type Body = "boy" | "girl";
export type Skin = "porcelain" | "light" | "tan" | "brown" | "deep";
export type HairStyle = "short" | "curly" | "bob" | "pigtails";
export type HairColor = "black" | "brown" | "ginger" | "blonde";
export type Look = { body: Body; skin: Skin; hair: HairStyle; hairColor: HairColor };
export type Profile = { name: string; look: Look };

export const SKIN: Record<Skin, string> = {
  porcelain: "oklch(0.9 0.035 65)",
  light: "oklch(0.82 0.06 60)",
  tan: "oklch(0.71 0.08 55)",
  brown: "oklch(0.56 0.08 50)",
  deep: "oklch(0.4 0.06 45)",
};
export const HAIR_COLOR: Record<HairColor, string> = {
  black: "oklch(0.2 0.01 60)",
  brown: "oklch(0.36 0.05 50)",
  ginger: "oklch(0.56 0.13 45)",
  blonde: "oklch(0.8 0.1 85)",
};
export const BODIES: Body[] = ["boy", "girl"];
export const SKINS = Object.keys(SKIN) as Skin[];
export const HAIRS: HairStyle[] = ["short", "curly", "bob", "pigtails"];
export const HAIR_COLORS = Object.keys(HAIR_COLOR) as HairColor[];

export const DEFAULT_LOOK: Look = { body: "girl", skin: "light", hair: "bob", hairColor: "brown" };

const KEY = "mwbb-profile-v1";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null") as Profile | null;
    if (!p || typeof p !== "object" || !p.look) return null;
    const { body, skin, hair, hairColor } = p.look;
    const valid =
      BODIES.includes(body) && SKINS.includes(skin) && HAIRS.includes(hair) && HAIR_COLORS.includes(hairColor);
    if (!valid) return null;
    return { name: sanitizeName(typeof p.name === "string" ? p.name : ""), look: { body, skin, hair, hairColor } };
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name: sanitizeName(p.name), look: p.look }));
  } catch {
    /* ignore */
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
