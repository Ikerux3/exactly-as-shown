import { useEffect, useRef, useState, type ReactNode } from "react";
import { BG } from "../assets";
import {
  CHAPTER_TITLE,
  COLOR_LABEL,
  MOTHER_LABEL,
  loadMemory,
  setMemoryForgotten,
  loadSave,
  sanitizeName,
  useGame,
  type ColorKey,
  type Screen,
} from "../store";
import { sfx, startMusic, stopMusic, unlockAudio } from "../audio";
import { GAMEPLAY_RULES, applyFinalCordura } from "../gameplayRules";
import { ChildDoll, GuestVoid, MotherCutout } from "../Props";
import { loadProfile, type Profile } from "../profile";
import { CharacterCreator } from "./Creator";
import { Ransom } from "../fx";
import { resetOnce } from "../kit";
import { interpretFavoriteToy } from "../ai/toy";
import { generateFavoriteToyImage } from "../ai/toy-image";
import { DialogueBar, Shell } from "../Shell";
import { useSpokenPrompt } from "../DialogueVoice";
import { adaptiveQuestion, currentQuestionContext, offlineAdaptiveQuestion } from "../ai/questions";

const CHAPTER_OF: Partial<Record<Screen, number>> = {
  ch1: 1,
  ch2k: 2,
  ch2d: 2,
  ch3: 3,
  ch4: 4,
  ch5: 5,
};

/* ---------------- TITLE / START MENU ---------------- */

type Panel = "menu" | "how" | "settings" | "character";

export function Title() {
  const muted = useGame((s) => s.muted);
  const [mem, setMem] = useState<{ runs: number; forgotten?: boolean | undefined }>({ runs: 0 });
  const [saved, setSaved] = useState<Screen | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [panel, setPanel] = useState<Panel>("menu");
  const [confirmNew, setConfirmNew] = useState(false);
  useEffect(() => {
    setMem(loadMemory());
    setSaved(loadSave()?.screen ?? null);
    setProfile(loadProfile());
  }, []);

  const newGame = () => {
    if (saved && !confirmNew) {
      setConfirmNew(true);
      sfx("tap");
      return;
    }
    unlockAudio();
    sfx("chime");
    resetOnce();
    const s = useGame.getState();
    s.newRun();
    s.go("intro");
  };
  const resume = () => {
    unlockAudio();
    sfx("chime");
    resetOnce();
    if (useGame.getState().continueRun() && useGame.getState().screen !== "ch4") startMusic();
  };
  const open = (p: Panel) => {
    unlockAudio();
    sfx("tap");
    setPanel(p);
    setConfirmNew(false);
  };
  const savedChapter = saved ? CHAPTER_OF[saved] : undefined;

  return (
    <Shell bars={false}>
      <img
        src={BG.bgTitle}
        alt="A small handmade house at dusk"
        className="scene-bg"
        style={{ objectPosition: "50% 50%" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.12 0.04 275 / .2), transparent 40%, oklch(0.06 0.02 275 / .55) 70%, oklch(0.06 0.02 275 / .92) 100%)",
        }}
      />
      <div className="absolute inset-x-0 top-[7%] px-6 text-center">
        <h1 className="space-y-2 text-[10cqw]" aria-label="Mommy will be back">
          <Ransom text="MOMMY" seed={3} className="block" />
          <Ransom text="will be" seed={8} className="block text-[0.6em]" />
          <span className="relative block">
            <Ransom text="BACK" seed={21} />
          </span>
        </h1>
      </div>

      {panel === "menu" && (
        <nav
          className="absolute inset-x-0 bottom-[6%] flex flex-col items-center gap-3 px-[12%] animate-float-up"
          aria-label="Main menu"
        >
          {saved ? (
            <>
              <button
                type="button"
                className="stitch-btn honey w-full text-lg leading-tight"
                onClick={resume}
              >
                Continue
                {savedChapter && (
                  <span className="block font-hand text-sm opacity-75">
                    Chapter {savedChapter} · {CHAPTER_TITLE[savedChapter]}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`stitch-btn w-full ${confirmNew ? "" : "ghost"}`}
                onClick={newGame}
              >
                {confirmNew ? "Start over? Tap again" : "New game"}
              </button>
            </>
          ) : (
            <button type="button" className="stitch-btn honey w-full text-lg" onClick={newGame}>
              Open the little house
            </button>
          )}
          <button
            type="button"
            className="stitch-btn ghost flex w-full items-center justify-center gap-2 py-1.5"
            onClick={() => open("character")}
          >
            {profile && (
              <span className="relative block h-8 w-6 shrink-0 overflow-hidden" aria-hidden>
                <ChildDoll
                  look={profile.look}
                  clothes="oklch(0.55 0.06 240)"
                  className="absolute left-1/2 top-0 h-[260%] -translate-x-1/2"
                />
              </span>
            )}
            <span className="truncate">
              {profile
                ? profile.name
                  ? `${profile.name} · your character`
                  : "Your character"
                : "Create your character"}
            </span>
          </button>
          <div className="grid w-full grid-cols-2 gap-3">
            <button
              type="button"
              className="stitch-btn ghost px-2 text-sm"
              onClick={() => open("how")}
            >
              How to play
            </button>
            <button
              type="button"
              className="stitch-btn ghost px-2 text-sm"
              onClick={() => open("settings")}
            >
              Settings
            </button>
          </div>
        </nav>
      )}

      {panel === "how" && (
        <MenuPanel title="How to play" onBack={() => open("menu")}>
          <ul className="space-y-2 text-left font-hand text-[clamp(13px,3.8cqw,15px)] leading-snug">
            <li>
              <b className="font-display">Tap</b> things in the house to look at them, open them and
              pick them up.
            </li>
            <li>
              <b className="font-display">The light switch</b> sits at the bottom of the screen. In
              the dark you hold a small light — drag your finger to look around. Some things only
              show in the dark.
            </li>
            <li>
              <b className="font-display">Fear</b> rises in the dark and when something frightens
              you. Light brings it back down. If it fills up, you'll have to try that part again.
            </li>
            <li>
              <b className="font-display">Subtitles</b> are always on. Tap them to skip ahead.
              Mommy's list shows what to do next.
            </li>
          </ul>
        </MenuPanel>
      )}

      {panel === "character" && (
        <CharacterCreator
          profile={profile}
          onClose={() => {
            setProfile(loadProfile());
            setPanel("menu");
          }}
        />
      )}

      {panel === "settings" && (
        <MenuPanel title="Settings" onBack={() => open("menu")}>
          <div className="space-y-3">
            <button
              type="button"
              className="stitch-btn sage w-full"
              aria-pressed={!muted}
              onClick={() => {
                unlockAudio();
                useGame.getState().setMute(!muted);
                if (muted) sfx("chime");
              }}
            >
              {muted ? "Sound: off" : "Sound: on"}
            </button>
            <button
              type="button"
              className="stitch-btn w-full"
              aria-pressed={!mem.forgotten}
              onClick={() => {
                const next = setMemoryForgotten(!mem.forgotten);
                setMem(next);
                sfx(next.forgotten ? "whisper" : "chime");
              }}
            >
              {mem.forgotten
                ? "The house forgot you — let it remember"
                : "The house remembers you — make it forget"}
            </button>
            <p className="text-xs leading-snug opacity-70">
              The house remembers your past visits on this device, and the game keeps your place at
              the start of each chapter.
            </p>
          </div>
        </MenuPanel>
      )}
    </Shell>
  );
}

function MenuPanel({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-x-[6%] bottom-[5%] flex max-h-[66%] flex-col"
      role="dialog"
      aria-label={title}
    >
      <div className="paper flex min-h-0 flex-1 flex-col p-5 animate-float-up">
        <p className="title-word text-center text-2xl">{title}</p>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
        <button type="button" className="stitch-btn honey mt-4 w-full" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

/* ---------------- INTRO ---------------- */

const COLORS: ColorKey[] = ["rose", "sage", "honey", "turq"];

export function Intro() {
  const s = useGame();
  // A character made in the menu already has a name: Mommy uses it instead of asking.
  const [profile] = useState(() => loadProfile());
  const knownName = !!profile?.name;
  const [raw, setRaw] = useState(profile?.name ?? "");
  const [step, setStep] = useState(knownName ? 1 : 0);
  const [toyInput, setToyInput] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(true);
  const initialQuestionRequested = useRef(false);
  const name = sanitizeName(raw);
  const invalidName = !!raw.trim() && !name;
  const [questionText, setQuestionText] = useState(() => {
    const kind = knownName ? "color" : "name";
    return offlineAdaptiveQuestion(
      currentQuestionContext(kind, profile?.name ? { name: profile.name } : {}),
    ).text;
  });
  useSpokenPrompt(questionText, "mother", !questionLoading);

  useEffect(() => {
    if (initialQuestionRequested.current) return;
    initialQuestionRequested.current = true;
    const kind = knownName ? "color" : "name";
    void adaptiveQuestion(
      currentQuestionContext(kind, {
        ...(profile?.name ? { name: profile.name } : {}),
        previousQuestions: [questionText],
      }),
    ).then((next) => {
      setQuestionText(next.text);
      setQuestionLoading(false);
    });
    // The first question is resolved once, before the player can answer it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmName = async () => {
    if (!name || questionLoading) return;
    sfx("tap");
    setQuestionLoading(true);
    const next = await adaptiveQuestion(
      currentQuestionContext("color", { name, previousQuestions: [questionText] }),
    );
    setQuestionText(next.text);
    setStep(1);
    setQuestionLoading(false);
  };

  const prepareToyQuestion = async () => {
    if (questionLoading) return;
    sfx("tap");
    setQuestionLoading(true);
    const next = await adaptiveQuestion(
      currentQuestionContext("toy", { name, previousQuestions: [questionText] }),
    );
    setQuestionText(next.text);
    setStep(2);
    setQuestionLoading(false);
  };

  const startGame = async () => {
    const answer = toyInput.trim();
    if (!answer || interpreting) return;
    setInterpreting(true);
    const result = await interpretFavoriteToy(answer);
    const toyId = result.category === "other" ? undefined : result.category;
    const toyOrder = toyId
      ? ([toyId, ...s.toyOrder.filter((toy) => toy !== toyId)] as typeof s.toyOrder)
      : s.toyOrder;
    const visualSlot = toyId ?? toyOrder[0];
    s.set({
      name,
      favToy: result.displayToy,
      favToyId: toyId,
      favToyVisualSlot: visualSlot,
      favToyAssetKey: undefined,
      favToyImage: undefined,
      toyOrder,
      introGuestLine: result.monsterLine,
    });
    // Mommy's goodbye plays as a short cinematic before chapter 1.
    s.go("prologue");
    if (result.customVisual) {
      const expectedToy = result.displayToy;
      void generateFavoriteToyImage(expectedToy).then((asset) => {
        const state = useGame.getState();
        if (asset && state.favToy === expectedToy) state.setFavoriteToyAsset(asset);
      });
    }
  };
  return (
    <Shell bars={false}>
      <img src={BG.bgPlayroom} alt="" className="scene-bg" style={{ objectPosition: "15% 50%" }} />
      <div className="absolute inset-0 bg-void/30" />
      {/* Mother: a faceless black cardboard cut-out, pinned to the scene (kept clear of the dialogue card) */}
      <MotherCutout
        color={`var(--c-${s.motherColor})`}
        className="absolute bottom-[4%] right-[7%] h-[38%]"
      />
      {/* your character, if you made one — dressed in the colour you pick */}
      {profile && (
        <ChildDoll
          look={profile.look}
          clothes={`var(--c-${s.favColor})`}
          className="absolute bottom-[4%] left-[14%] h-[27%]"
        />
      )}
      <div className="absolute inset-x-[6%] top-[5%] paper animate-float-up p-5">
        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void confirmName();
            }}
          >
            <p className="font-display text-[clamp(15px,4.6cqw,19px)] leading-snug">
              “{questionText}”
            </p>
            <label className="mt-4 block text-xs uppercase tracking-widest opacity-60" htmlFor="nm">
              Your name
            </label>
            <input
              id="nm"
              value={raw}
              maxLength={14}
              onChange={(e) => setRaw(e.target.value)}
              aria-invalid={invalidName}
              aria-describedby={invalidName ? "name-error" : undefined}
              className="mt-1 w-full rounded-md border-2 border-dashed border-wood-light bg-paper-deep/60 px-3 py-2 font-hand text-xl text-ink outline-none focus:border-honey"
              placeholder="e.g. Lucy"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
            />
            {invalidName && (
              <p id="name-error" className="mt-1 text-xs text-crimson" role="alert">
                That name can't be used.
              </p>
            )}
            <button
              type="submit"
              className="stitch-btn sage mt-4 w-full"
              disabled={!name || questionLoading}
            >
              {questionLoading ? "Mommy is thinking…" : "That's me"}
            </button>
          </form>
        )}
        {step === 1 && (
          <>
            <p className="font-display text-[clamp(15px,4.6cqw,19px)] leading-snug">
              “{questionText}”
            </p>
            <div
              className="mt-4 grid grid-cols-4 gap-3"
              role="radiogroup"
              aria-label="Favourite colour"
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={s.favColor === c}
                  onClick={() => {
                    sfx("tap");
                    s.set({ favColor: c });
                  }}
                  aria-label={COLOR_LABEL[c]}
                  className={`aspect-square rounded-full shadow-md transition ${s.favColor === c ? "scale-105 ring-4 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                  style={{
                    background: `var(--c-${c})`,
                    outline: "2px dashed oklch(1 0 0 / .6)",
                    outlineOffset: -5,
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm opacity-70">
              <span className="font-display">{COLOR_LABEL[s.favColor]}</span> it is. She buttons her{" "}
              {MOTHER_LABEL[s.motherColor]} coat.
            </p>
            <button
              className="stitch-btn mt-4 w-full"
              onClick={() => void prepareToyQuestion()}
              disabled={questionLoading}
            >
              {questionLoading ? "Mommy is thinking…" : "One more thing…"}
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <p className="font-display text-lg leading-snug">“{questionText}”</p>
            <p className="mt-1 text-xs opacity-60">Something behind Mommy seems to lean closer.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void startGame();
              }}
            >
              <label
                className="block text-xs uppercase tracking-widest opacity-60"
                htmlFor="fav-toy"
              >
                Favourite toy
              </label>
              <input
                id="fav-toy"
                autoFocus
                maxLength={120}
                value={toyInput}
                onChange={(event) => setToyInput(event.target.value)}
                disabled={interpreting}
                placeholder="A teddy, a dinosaur…"
                className="w-full rounded-md border-2 border-dashed border-wood-light bg-paper-deep/60 px-3 py-2 font-hand text-lg text-ink outline-none focus:border-honey"
              />
              <button
                type="submit"
                className="stitch-btn w-full"
                disabled={!toyInput.trim() || interpreting}
              >
                {interpreting ? "The house is listening…" : "Bye, Mommy"}
              </button>
            </form>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ---------------- FINAL ---------------- */

export function Final() {
  const s = useGame();
  const [phase, setPhase] = useState<"blackout" | "whisper" | "door">("blackout");
  const [canRun, setCanRun] = useState(false);
  const finalValue = s.finalCordura ?? s.cordura;
  const intense = finalValue >= 100;

  useEffect(() => {
    stopMusic();
    const st = useGame.getState();
    // Unique exception to the standard darkness timer: six seconds add just +5 TOTAL.
    // No Stage is mounted in the finale, so the regular 100% reset cannot run here.
    const frozen = applyFinalCordura(st.cordura, st.finalCordura);
    st.set({
      interactive: false,
      lightsOn: false,
      objective: "",
      cordura: frozen,
      finalCordura: frozen,
    });
    sfx("heartbeat");
    const beating = window.setInterval(() => sfx("heartbeat"), 960);
    const whisper = window.setTimeout(() => {
      window.clearInterval(beating);
      setPhase("whisper");
      sfx(frozen >= 100 ? "scare" : "whisper");
      useGame.getState().say({
        speaker: "mimic",
        text: (useGame.getState().name || "Little one") + "… I can still see you.",
        ms: 1600,
      });
    }, GAMEPLAY_RULES.finalBlackoutSeconds * 1000);
    const door = window.setTimeout(() => {
      const state = useGame.getState();
      state.set({ line: undefined, queue: [] });
      setPhase("door");
      sfx("open");
      state.say([
        { speaker: "narrator", text: "A key turns in the front door. Warm light fills the hall." },
        {
          speaker: "mother",
          text: (state.name || "Sweetheart") + "? I'm home! I'm so sorry I took so long.",
          onShow: () => setCanRun(true),
        },
      ]);
    }, 8000);
    return () => {
      window.clearInterval(beating);
      window.clearTimeout(whisper);
      window.clearTimeout(door);
    };
  }, []);

  return (
    <Shell bottom={<DialogueBar />}>
      {phase !== "door" ? (
        <div
          className="final-heartbeat-shake absolute inset-0 grid place-items-center bg-void"
          role="status"
          aria-label="Six seconds of darkness, a frightened heartbeat, and a whisper"
        >
          {phase === "whisper" && (
            <>
              {intense && (
                <div
                  className="absolute left-1/2 top-[30%] flex -translate-x-1/2 gap-9"
                  aria-hidden
                >
                  <span className="h-4 w-7 rounded-[50%] bg-crimson shadow-[0_0_22px_var(--crimson)]" />
                  <span className="h-4 w-7 rounded-[50%] bg-crimson shadow-[0_0_22px_var(--crimson)]" />
                </div>
              )}
              <p className={"subtitle guest px-4 py-3 text-lg " + (intense ? "text-crimson" : "")}>
                {s.name || "Little one"}… I can still see you.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <img
            src={BG.bgHallway}
            alt="The front door opening"
            className="scene-bg animate-in fade-in duration-1000"
            style={{ objectPosition: "60% 50%" }}
          />
          <GuestVoid
            style={{ left: "2%", top: "8%", height: "70%", opacity: 0.6 }}
            intensity={0.6}
          />
          {canRun && (
            <div className="absolute inset-x-0 bottom-[6%] flex justify-center animate-float-up">
              <button
                type="button"
                className="stitch-btn honey text-lg"
                onClick={() => {
                  s.set({ line: undefined, queue: [] });
                  s.go("ending");
                }}
              >
                Run to Mommy
              </button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
