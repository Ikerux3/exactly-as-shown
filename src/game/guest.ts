// The local Guest director chooses only from a validated list of interventions.
// Gemini can add grounded reactions at safe checkpoints, while these deterministic
// rules keep the whole game playable and adaptive offline.
import { TOY_LABEL, type Facts } from "./store";

export const GUEST_MIND_LABEL = "Guest mind: Gemini adaptive director · validated offline fallback";

export type Intervention =
  { kind: "flicker" } | { kind: "shadow" } | { kind: "line"; text: string };

const ALLOWED = new Set(["flicker", "shadow", "line"]);

export function validate(i: unknown): Intervention | null {
  if (!i || typeof i !== "object") return null;
  const k = (i as { kind?: string }).kind;
  if (!k || !ALLOWED.has(k)) return null;
  if (k === "line") {
    const t = (i as { text?: unknown }).text;
    if (typeof t !== "string" || t.length > 140) return null;
  }
  return i as Intervention;
}

export function chooseInterventions(f: Facts, chapter: number): Intervention[] {
  const out: Intervention[] = [];
  const toy = f.firstToy ? TOY_LABEL[f.firstToy] : undefined;
  if (chapter === 2 && toy)
    out.push({ kind: "line", text: `You picked up the ${toy} first. It was waiting longest.` });
  if (chapter === 3) {
    if (f.darkSeconds > 40)
      out.push({ kind: "line", text: "You stay in the dark longer than the others did." });
    else
      out.push({
        kind: "line",
        text: "You keep reaching for the switch. The light can't stay on forever.",
      });
  }
  if (chapter === 4 && f.mistakes > 2)
    out.push({ kind: "line", text: "You make little mistakes. Mothers forgive little mistakes." });
  if (chapter === 5 && f.previousRuns > 0)
    out.push({ kind: "line", text: "You came back. I kept your room the way you left it." });
  out.push(f.lightToggles > 12 ? { kind: "flicker" } : { kind: "shadow" });
  return out.map(validate).filter((x): x is Intervention => x !== null);
}
