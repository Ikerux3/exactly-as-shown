import { COLOR_LABEL, useGame } from "../store";
import { safePlayerText } from "../safety";
import type { AdaptiveQuestion, AdaptiveQuestionContext, QuestionKind } from "./contracts";
import { generateAdaptiveQuestionAI } from "./questions.functions";

const VARIANTS: Record<QuestionKind, ((context: AdaptiveQuestionContext) => string)[]> = {
  name: [
    () => "I'm popping out for groceries, sweetheart. What should I call you while I'm gone?",
    () => "Before I go, tell me your name, sweetheart?",
    (context) =>
      `The house remembers visit ${context.previousRuns + 1}. What is your name this time?`,
  ],
  color: [
    (context) =>
      `And your favourite colour, ${context.name ?? "sweetheart"}? I'll get you a new cup.`,
    (context) => `Which colour feels most like yours, ${context.name ?? "sweetheart"}?`,
    (context) => `What colour should I remember for you, ${context.name ?? "sweetheart"}?`,
  ],
  toy: [
    (context) => `Which toy is your absolute favourite, ${context.name ?? "sweetheart"}?`,
    (context) =>
      `If you kept one toy close tonight, which would it be, ${context.name ?? "sweetheart"}?`,
    (context) => `You chose ${context.favColor ?? "that colour"}. Which toy belongs beside it?`,
  ],
  food: [
    () => "What do you like to eat best?",
    (context) =>
      `I remembered ${context.favToy ?? "your toy"}. What should I put beside it for dinner?`,
    (context) => {
      const choice = context.choiceTrail.at(-1) ?? "that place";
      return `You looked at ${choice} first. Which food do you always choose?`;
    },
  ],
};

function seed(context: AdaptiveQuestionContext): number {
  return (
    context.previousRuns * 5 +
    context.mistakes * 5 +
    context.lightToggles * 7 +
    context.dialogueSkips * 11 +
    context.choiceTrail.length * 13 +
    ({ name: 0, color: 1, toy: 2, food: 3 } as const)[context.kind]
  );
}

export function offlineAdaptiveQuestion(context: AdaptiveQuestionContext): AdaptiveQuestion {
  const options = VARIANTS[context.kind];
  const text = options[seed(context) % options.length]!(context);
  return {
    text,
    groundedIn: context.choiceTrail.at(-1) ?? context.favToy ?? context.name ?? "question type",
    fallbackUsed: true,
    provider: "offline",
  };
}

export function currentQuestionContext(
  kind: QuestionKind,
  overrides: Partial<AdaptiveQuestionContext> = {},
): AdaptiveQuestionContext {
  const state = useGame.getState();
  const name = state.name ? safePlayerText(state.name, "sweetheart") : undefined;
  const favToy = state.favToy ? safePlayerText(state.favToy, "your toy") : undefined;
  return {
    kind,
    ...(name ? { name } : {}),
    favColor: `${COLOR_LABEL[state.favColor].toLowerCase()} colour`,
    ...(favToy ? { favToy } : {}),
    previousRuns: state.facts.previousRuns,
    mistakes: state.facts.mistakes,
    lightToggles: state.facts.lightToggles,
    dialogueSkips: state.facts.dialogueSkips,
    choiceTrail: state.facts.choiceTrail.map((choice) =>
      safePlayerText(choice, "a previous choice"),
    ),
    previousQuestions: [],
    ...overrides,
  };
}

export async function adaptiveQuestion(
  context: AdaptiveQuestionContext,
): Promise<AdaptiveQuestion> {
  const fallback = offlineAdaptiveQuestion(context);
  try {
    return await Promise.race([
      generateAdaptiveQuestionAI({ data: context }),
      new Promise<never>((_, reject) =>
        globalThis.setTimeout(() => reject(new Error("Adaptive question timed out")), 2_400),
      ),
    ]);
  } catch {
    return fallback;
  }
}
