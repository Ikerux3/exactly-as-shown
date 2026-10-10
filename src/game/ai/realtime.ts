import { TOY_LABEL, useGame } from "../store";
import { safePlayerText } from "../safety";
import type {
  AdaptiveChapter,
  RealtimeContext,
  RealtimeDecision,
  RealtimeEvent,
  RealtimeObservation,
} from "./contracts";
import { directRealtimeMomentAI } from "./realtime.functions";

const pending = new Map<string, Promise<RealtimeDecision>>();

function actionFor(context: RealtimeContext): RealtimeDecision["action"] {
  if (
    context.recent.recentMistakes >= 2 ||
    context.facts.currentMistakeStreak >= 2 ||
    context.facts.hintsUsed >= 3 ||
    context.cordura >= 75
  )
    return "ease";
  if (
    context.recent.recentMistakes === 0 &&
    ((context.recent.elapsedMs !== undefined && context.recent.elapsedMs < 18_000) ||
      context.facts.fastCompletions >= 2)
  ) {
    return "escalate";
  }
  return "hold";
}

export function offlineRealtimeDecision(context: RealtimeContext): RealtimeDecision {
  const action = actionFor(context);
  const toy = safePlayerText(context.favToy ?? context.firstToy, "your favourite toy");
  const food = safePlayerText(context.favFood, "dinner");
  const round = context.recent.round ?? 1;
  const mistakes = context.recent.recentMistakes;
  let groundedIn = toy;
  let line: string;

  switch (context.event) {
    case "round_complete":
      groundedIn = `round ${round}`;
      line =
        mistakes === 0
          ? `Round ${round}, without one wrong note. I can make the next song remember you better.`
          : `Round ${round} took ${mistakes} restarts. The music box noticed where you hesitated.`;
      break;
    case "mistake_streak":
      groundedIn = `${mistakes} mistakes`;
      line = `${mistakes} mistakes. I can show you more, but the room will know that I helped.`;
      break;
    case "puzzle_solved":
      if (context.facts.hintsUsed > 0) {
        groundedIn = `${context.facts.hintsUsed} hints`;
        line = `You used ${context.facts.hintsUsed} hints, then opened it. I remember what makes you look twice.`;
      } else {
        groundedIn = mistakes > 0 ? `${mistakes} mistakes` : "no mistakes";
        line =
          mistakes === 0
            ? "No mistakes. The lock barely had time to learn your hands."
            : `${mistakes} mistakes, then you recovered. The lock remembers both parts.`;
      }
      break;
    case "tasks_complete":
      if (context.facts.dialogueSkips >= 3) {
        groundedIn = `${context.facts.dialogueSkips} skipped lines`;
        line = `${context.facts.dialogueSkips} skipped lines, yet you finished bedtime. You listen with your hands.`;
      } else {
        groundedIn = food;
        line = `You finished bedtime after ${food}. Now the room only needs to return ${toy}.`;
      }
      break;
    case "search_miss": {
      const choice = safePlayerText(context.recent.choice, "there");
      groundedIn = choice;
      line = `You chose ${choice}. I learned where you look first, so ${toy} is somewhere else.`;
      break;
    }
  }

  return { action, line: line.slice(0, 140), groundedIn, fallbackUsed: true, provider: "offline" };
}

function contextFor(
  chapter: AdaptiveChapter,
  event: RealtimeEvent,
  checkpoint: string,
  recent: RealtimeObservation,
): RealtimeContext {
  const state = useGame.getState();
  const previousLines = Object.values(state.adaptiveMoments)
    .slice(-4)
    .map((moment) => safePlayerText(moment.line, "The room remembers."));
  const safeName = state.name ? safePlayerText(state.name, "Little one") : undefined;
  const safeFood = state.favFood
    ? safePlayerText(state.favFood, "your favourite dinner")
    : undefined;
  const safeToy = state.favToy ? safePlayerText(state.favToy, "your favourite toy") : undefined;
  const safeChoice = recent.choice ? safePlayerText(recent.choice, "a previous choice") : undefined;
  return {
    chapter,
    checkpoint,
    event,
    cordura: state.cordura,
    favColor: state.favColor,
    ...(safeName ? { name: safeName } : {}),
    ...(safeFood ? { favFood: safeFood } : {}),
    ...(safeToy ? { favToy: safeToy } : {}),
    ...(state.facts.firstToy ? { firstToy: TOY_LABEL[state.facts.firstToy] } : {}),
    facts: {
      ...state.facts,
      choiceTrail: state.facts.choiceTrail.map((choice) =>
        safePlayerText(choice, "a previous choice"),
      ),
    },
    recent: { ...recent, ...(safeChoice ? { choice: safeChoice } : {}) },
    previousLines,
  };
}

/** One idempotent AI decision at a safe checkpoint; never mutates a puzzle directly. */
export function runAdaptiveMoment(
  chapter: AdaptiveChapter,
  event: RealtimeEvent,
  checkpoint: string,
  recent: RealtimeObservation,
): Promise<RealtimeDecision> {
  const key = `${chapter}:${checkpoint}`;
  const saved = useGame.getState().adaptiveMoments[key];
  if (saved) return Promise.resolve(saved);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const context = contextFor(chapter, event, checkpoint, recent);
  const fallback = offlineRealtimeDecision(context);
  const request = Promise.race([
    directRealtimeMomentAI({ data: context }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Realtime director timed out")), 2_400),
    ),
  ])
    .catch(() => fallback)
    .then((decision) => {
      const state = useGame.getState();
      state.set({ adaptiveMoments: { ...state.adaptiveMoments, [key]: decision } });
      return decision;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
