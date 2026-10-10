import { useEffect, useRef, useState } from "react";
import { OnWall, Stage, illuminated } from "../Stage";
import { pajamaWall } from "../roomLayout";
import { BG, MUSICBOX, toyImageFor } from "../assets";
import { TOY_LABEL, useGame } from "../store";
import {
  Clock,
  GuestVoid,
  Key,
  Pajamas,
  PhotoFrame,
  Symbol,
  Toothbrush,
  TrinketBox,
  type Sym,
} from "../Props";
import { Hint, useSceneIntro } from "../kit";
import { sfx, startMusic, stopMusic } from "../audio";
import { chooseInterventions } from "../guest";
import { useAdaptiveChapter } from "../ai/adapt";
import { runAdaptiveMoment } from "../ai/realtime";
import type { AdaptivePlan, RealtimeAction } from "../ai/contracts";

/* ---------------- CHAPTER 3 — THE MUSIC BOX ---------------- */
const SYMS: Sym[] = ["star", "moon", "heart", "key"];
const LENS = [3, 4, 5, 7];
const ADAPTIVE_LENS = {
  gentle: LENS,
  standard: LENS,
  relentless: LENS,
} as const;
const DIFFICULTIES: AdaptivePlan["difficulty"][] = ["gentle", "standard", "relentless"];
const SYM_COLOR: Partial<Record<Sym, string>> = {
  star: "var(--honey)",
  moon: "var(--turq)",
  heart: "var(--rose)",
  key: "var(--brass)",
};

function shiftedDifficulty(base: AdaptivePlan["difficulty"], action: RealtimeAction) {
  const index = DIFFICULTIES.indexOf(base);
  const shift = action === "ease" ? -1 : action === "escalate" ? 1 : 0;
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, index + shift))]!;
}

export function Ch3() {
  const s = useGame();
  const incomingPlan = useAdaptiveChapter(3);
  const plan = useRef(incomingPlan).current;
  const round = s.ch3Rounds;
  const [seq, setSeq] = useState<Sym[]>([]);
  const [show, setShow] = useState<number>(-1);
  const [input, setInput] = useState<Sym[]>([]);
  const [done, setDone] = useState(false);
  const [liveAction, setLiveAction] = useState<RealtimeAction>("hold");
  const [betweenRounds, setBetweenRounds] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => useGame.getState().set({ flicker: Date.now() }), 1200);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (round === 3 && !s.lightsOn && s.interactive) sfx("creak");
  }, [round, s.lightsOn, s.interactive]);
  const aiLineSpoken = useRef(false);
  const roundMistakes = useRef(0);
  const roundStartedAt = useRef(Date.now());
  const timedRound = useRef(-1);

  useSceneIntro(
    "ch3",
    "Stop the music box. Watch the pattern in the dark, play it back in the light.",
    [
      { speaker: "narrator", text: "Your music box is playing by itself on the nightstand." },
      ...chooseInterventions(s.facts, 3)
        .filter((i) => i.kind === "line")
        .map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
    ],
  );

  useEffect(() => {
    if (round >= 4) return;
    const bias: Sym =
      s.favColor === "rose"
        ? "heart"
        : s.favColor === "turq"
          ? "moon"
          : s.favColor === "honey"
            ? "star"
            : "key";
    const difficulty = shiftedDifficulty(plan.difficulty, liveAction);
    const length = ADAPTIVE_LENS[difficulty][round]!;
    setSeq(
      Array.from({ length }, (_, index) =>
        index === 0 ? bias : SYMS[Math.floor(Math.random() * 4)]!,
      ),
    );
    setInput([]);
    roundMistakes.current = 0;
    roundStartedAt.current = Date.now();
    // Difficulty changes are applied only when a completed round advances this counter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, s.favColor]);

  useEffect(() => {
    if (!s.interactive || betweenRounds || timedRound.current === round) return;
    timedRound.current = round;
    roundStartedAt.current = Date.now();
  }, [s.interactive, betweenRounds, round]);

  useEffect(() => {
    if (plan.provider !== "gemini" || aiLineSpoken.current) return;
    aiLineSpoken.current = true;
    useGame.getState().say({ speaker: "guest", text: plan.guestLine });
  }, [plan]);

  // Pattern loops only in darkness.
  useEffect(() => {
    if (s.lightsOn || !seq.length || done) {
      setShow(-1);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      const idx = i % (seq.length + 2);
      if (idx < seq.length) {
        setShow(idx);
        sfx("note", SYMS.indexOf(seq[idx]!));
      } else setShow(-1);
      i++;
    }, 850);
    return () => window.clearInterval(id);
  }, [s.lightsOn, seq, done]);

  const press = (sym: Sym) => {
    if (!s.lightsOn || done || betweenRounds) return;
    sfx("note", SYMS.indexOf(sym));
    const next = [...input, sym];
    if (seq[next.length - 1] !== sym) {
      sfx("wrong");
      s.mistake();
      roundMistakes.current += 1;
      setInput([]);
      s.say({ speaker: "narrator", text: "The tune stumbles and starts over.", ms: 1800 });
      return;
    }
    setInput(next);
    if (next.length === seq.length) {
      sfx("chime");
      const completedRound = round + 1;
      const observedMistakes = roundMistakes.current;
      const elapsedMs = Date.now() - roundStartedAt.current;
      s.success(elapsedMs);
      if (round + 1 >= 4) {
        setDone(true);
        stopMusic();
        s.set({ ch3Rounds: 4, interactive: false, objective: "" });
        s.say([
          {
            speaker: "narrator",
            text: "You open the mechanism and hold the cylinder still. The music stops.",
          },
          {
            speaker: "narrator",
            text: "The ballerina has stopped mid-turn. She is facing the door.",
          },
          { speaker: "narrator", text: "Then, from down the hall, a voice you know." },
        ]);
        window.setTimeout(() => useGame.getState().go("ch4"), 10500);
      } else {
        setBetweenRounds(true);
        s.set({ interactive: false });
        void runAdaptiveMoment(3, "round_complete", `round-${completedRound}`, {
          recentMistakes: observedMistakes,
          round: completedRound,
          elapsedMs,
        }).then((decision) => {
          const state = useGame.getState();
          if (state.screen !== "ch3") return;
          setLiveAction(decision.action);
          state.set({ line: { speaker: "guest", text: decision.line, ms: 2600 }, queue: [] });
          window.setTimeout(() => {
            const latest = useGame.getState();
            if (latest.screen !== "ch3") return;
            latest.set({ ch3Rounds: completedRound, interactive: true });
            setBetweenRounds(false);
          }, 2700);
        });
      }
    }
  };

  return (
    <Stage
      bg={BG.bgBedroom}
      spread
      bgPos="55% 50%"
      chapter={3}
      chapterCard
      progress={`Song ${Math.min(round + 1, 4)}/4`}
      guest={{ x: 12, y: 20, h: 55, show: round >= 2 }}
      clues={
        show >= 0 &&
        seq[show] && (
          <OnWall n={0}>
          <div
            key={`${round}-${show}`}
            className="glow-clue absolute left-[45%] top-[18%] -translate-x-1/2 animate-float-up"
          >
            <Symbol s={seq[show]} size={96} color={SYM_COLOR[seq[show]]} />
          </div>
          </OnWall>
        )
      }
    >
      <OnWall n={0}>
      {/* The icon on the box teaches how to reveal the melody. */}
      <div
        className="pointer-events-none absolute right-[5%] top-[25%] rounded-md bg-void/80 px-2 py-1 text-center text-xs text-paper"
        aria-hidden
      >
        💡 ↓ ♪
      </div>
      <div className="paper absolute left-[6%] top-[24%] max-w-[34%] rotate-[-4deg] px-2 py-1 font-hand text-[11px] leading-tight">
        for {s.favToy ?? "your toy"}
        <br />
        after {s.favFood ?? "dinner"}
      </div>
      <img
        src={MUSICBOX}
        alt="Your music box"
        className="absolute left-[44%] top-[33%] w-[34%] -translate-x-1/2 drop-shadow-[0_10px_8px_oklch(0.1_0.02_50/.8)]"
        style={{ animation: done ? undefined : "void-breathe 1.7s ease-in-out infinite" }}
        draggable={false}
      />
      <div
        className="absolute left-1/2 top-[60%] flex -translate-x-1/2 gap-2"
        aria-label={`Round ${Math.min(round + 1, 4)} of 4`}
      >
        {LENS.map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full border-2 border-paper ${i < round ? "bg-honey" : ""}`}
          />
        ))}
      </div>
      {!done && (
        <div className="absolute inset-x-[5%] top-[66%] paper p-3">
          <div className="mb-2 flex min-h-5 justify-center gap-1">
            {seq.map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i < input.length ? "bg-wood" : "bg-paper-deep"}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SYMS.map((sym) => (
              <button
                key={sym}
                onClick={() => press(sym)}
                disabled={!s.lightsOn || betweenRounds}
                aria-label={sym}
                className="grid aspect-square place-items-center rounded-xl bg-paper-deep shadow-inner transition active:scale-95 disabled:opacity-40"
              >
                <Symbol s={sym} size={44} color={SYM_COLOR[sym]} />
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs opacity-70">
            {s.lightsOn
              ? "Play the pattern back. Turn the light off to see it again."
              : "Watch above the music box…"}
          </p>
        </div>
      )}
      </OnWall>
      <OnWall n={1}>
        <button type="button" className="absolute left-[20%] top-[42%] w-[60%] rounded-xl border-2 border-paper/40 bg-void/70 p-5 text-center font-hand text-paper active:scale-[0.98] touch-manipulation" onClick={() => { s.inspect("scratched wall"); s.say({ speaker: "narrator", text: "Scratched into the wall: LISTEN IN THE DARK. PLAY IN THE LIGHT.", ms: 2500 }); }}>
          A music note scratched into the wall · Examine
        </button>
      </OnWall>
      <OnWall n={2}>
        <button type="button" className="absolute left-[23%] top-[26%] flex min-h-20 w-[54%] items-center justify-center rounded-t-2xl border-2 border-paper/40 bg-void/75 p-3 text-center font-hand text-paper touch-manipulation" onClick={() => { s.inspect("bedroom window"); s.say({ speaker: "narrator", text: "The glass is cold. Something is standing outside.", ms: 2000 }); }}>
          {!s.lightsOn && round >= 2 && !done ? "A human-shaped silhouette fills the window." : "The dark window"}
        </button>
      </OnWall>
      <OnWall n={3}>
        <button type="button" className="absolute left-[17%] top-[55%] w-[66%] rounded-xl border-2 border-paper/40 bg-void/70 p-4 text-center font-hand text-paper touch-manipulation" onClick={() => { s.inspect("music box inscription"); s.say({ speaker: "narrator", text: "One wrong note starts only that verse again. Remember the whole melody.", ms: 2600 }); }}>
          A torn page of music · Examine
        </button>
      </OnWall>
    </Stage>
  );
}

/* ---------------- CHAPTER 4 — MOTHER'S ROOM ---------------- */
const PANEL: Sym[] = ["flower", "star", "moon", "heart", "eye", "key"];
const PUZZLES: Record<
  "garden" | "keepsake" | "night",
  { answer: Sym[]; clue: string[]; positions: Array<[number, number]> }
> = {
  garden: {
    answer: ["flower", "moon", "eye"],
    clue: ["what blooms", "what sleeps in the sky", "what is always watching"],
    positions: [
      [19, 11],
      [22, 58],
      [55, 16],
    ],
  },
  keepsake: {
    answer: ["heart", "key", "star"],
    clue: ["what you keep", "what opens", "what guides you home"],
    positions: [
      [19, 11],
      [22, 58],
      [55, 16],
    ],
  },
  night: {
    answer: ["moon", "eye", "key"],
    clue: ["what follows night", "what watches", "what lets you leave"],
    positions: [
      [19, 11],
      [22, 58],
      [55, 16],
    ],
  },
};

export function Ch4() {
  const s = useGame();
  const incomingPlan = useAdaptiveChapter(4);
  const plan = useRef(incomingPlan).current;
  const puzzle = PUZZLES.garden;
  const [note, setNote] = useState(false);
  const [input, setInput] = useState<Sym[]>([]);
  const [solved, setSolved] = useState(false);
  const [hasKey, setKey] = useState(false);
  const [wardrobe, setWardrobe] = useState(0);
  const [wrongTry, setWrongTry] = useState<Sym[] | null>(null); // visual only: the failed attempt, shown briefly
  const aiLineSpoken = useRef(false);
  const wrongCount = useRef(0);
  const reactionRequested = useRef(false);
  const chapterStartedAt = useRef(Date.now());
  const timingStarted = useRef(false);
  const hintRecorded = useRef(false);
  const inspected = useRef(new Set<string>());
  const nm = s.name || "sweetheart";

  useEffect(() => setInput([]), [plan.puzzleVariant]);
  useEffect(() => {
    if (plan.provider !== "gemini" || aiLineSpoken.current) return;
    aiLineSpoken.current = true;
    useGame.getState().say({ speaker: "guest", text: plan.guestLine });
  }, [plan]);

  useSceneIntro(
    "ch4",
    "Find a way out of Mommy's room.",
    [
      { speaker: "mimic", text: `${nm}? Sweetheart, come to my room. I'm back early.` },
      { speaker: "narrator", text: "Mommy's room. Nobody is here." },
      { speaker: "narrator", text: "Behind you, the door clicks shut." },
      ...chooseInterventions(s.facts, 4)
        .filter((i) => i.kind === "line")
        .map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
    ],
    () => window.setTimeout(() => sfx("creak"), 5000),
  );

  useEffect(() => {
    if (!s.interactive || timingStarted.current) return;
    timingStarted.current = true;
    chapterStartedAt.current = Date.now();
  }, [s.interactive]);

  const press = (sym: Sym) => {
    if (!s.lightsOn || solved) return;
    sfx("tap");
    const next = [...input, sym];
    if (puzzle.answer[next.length - 1] !== sym) {
      sfx("wrong");
      s.mistake();
      setInput([]);
      wrongCount.current += 1;
      setWrongTry(next);
      window.setTimeout(() => setWrongTry(null), 750);
      if (wrongCount.current === 2 && !reactionRequested.current) {
        reactionRequested.current = true;
        const requestPhase = useGame.getState().phaseKey;
        void runAdaptiveMoment(4, "mistake_streak", "lock-mistakes", {
          recentMistakes: wrongCount.current,
          elapsedMs: Date.now() - chapterStartedAt.current,
        }).then((decision) => {
          const state = useGame.getState();
          if (state.screen !== "ch4" || state.phaseKey !== requestPhase) return;
          if (decision.action === "ease") {
            setNote(true);
            // AI may reveal a hint but cannot change deterministic Cordura rates.
          }
          if (decision.action === "escalate")
            state.set({ flicker: Date.now(), shadowPass: Date.now() });
          state.say({ speaker: "guest", text: decision.line, ms: 3000 });
        });
      }
      return;
    }
    setWrongTry(null);
    setInput(next);
    if (next.length === 3) {
      setSolved(true);
      sfx("open");
      sfx("chime");
      s.success(Date.now() - chapterStartedAt.current);
      s.say({ speaker: "narrator", text: "Click. A hidden drawer slides out from under the bed." });
      if (!reactionRequested.current) {
        reactionRequested.current = true;
        const requestPhase = useGame.getState().phaseKey;
        void runAdaptiveMoment(4, "puzzle_solved", "lock-solved", {
          recentMistakes: wrongCount.current,
          elapsedMs: Date.now() - chapterStartedAt.current,
        }).then((decision) => {
          const state = useGame.getState();
          if (state.screen !== "ch4" || state.phaseKey !== requestPhase) return;
          // AI reactions stay narrative; only darkness and actual scares change Cordura.
          if (decision.action === "escalate") {
            state.set({ flicker: Date.now(), shadowPass: Date.now() });
          }
          state.say({ speaker: "guest", text: decision.line, ms: 3000 });
        });
      }
    }
  };

  const takeKey = () => {
    setKey(true);
    sfx("chime");
    s.set({ objective: "Unlock the door. Don't look at the wardrobe." });
    sfx("creak");
    setWardrobe(1);
    s.say([
      { speaker: "mimic", text: `${nm}… don't go. Come here. Come inside with Mommy.` },
      {
        speaker: "narrator",
        text: "The wardrobe door is opening. The voice is coming from inside it.",
      },
      { speaker: "narrator", text: "Mommy has never sounded like that. Mommy is at the shop." },
    ]);
    window.setTimeout(() => setWardrobe(2), 3500);
  };

  const inspectItem = (label: string, text: string, ms: number) => {
    if (!inspected.current.has(label)) {
      inspected.current.add(label);
      s.inspect(label);
    }
    s.say({ speaker: "narrator", text, ms });
  };

  const openHint = () => {
    if (!hintRecorded.current) {
      hintRecorded.current = true;
      s.useHint();
    }
    sfx("tap");
    setNote(true);
  };

  return (
    <Stage
      bg={BG.bgMother}
      spread
      bgPos="75% 50%"
      chapter={4}
      chapterCard
      progress={
        hasKey ? "You have the key" : solved ? "The drawer is open" : `Lock ${input.length}/3`
      }
      guest={{ x: 88, y: 14, h: 62, show: true }}
      clues={
        !solved && (
          <>
            {puzzle.answer.map((symbol, index) => (
              <OnWall key={symbol} n={index === 0 ? 1 : index === 1 ? 3 : 2}>
              <div
                className="glow-clue absolute"
                style={{
                  left: `${puzzle.positions[index]![0]}%`,
                  top: `${puzzle.positions[index]![1]}%`,
                }}
              >
                <Symbol s={symbol} size={44} color="var(--glow)" />
              </div>
              </OnWall>
            ))}
          </>
        )
      }
      above={
        <>
          {note && (
            <button
              onClick={() => setNote(false)}
              className="absolute inset-x-[10%] top-[22%] z-20 paper animate-float-up p-5 text-left"
            >
              <p className="font-hand text-xl leading-snug">
                The little box sits between the photograph and the clock.
                <br />
                The clock is last.
                <br />
                Which symbols did you see on those objects in darkness?
              </p>
              <p className="mt-3 font-hand text-sm opacity-75">
                You said {s.favToy ?? "your toy"}. You asked for {s.favFood ?? "dinner"}. The room
                listened.
              </p>
              <p className="mt-2 text-right font-hand text-sm opacity-70">— M.</p>
            </button>
          )}
        </>
      }
    >
      <OnWall n={0}>
      {/* wardrobe opening */}
      <div
        className="pointer-events-none absolute right-0 top-[17%] h-[78%] bg-void transition-all duration-[3000ms]"
        style={{
          width: wardrobe === 0 ? "3%" : wardrobe === 1 ? "9%" : "14%",
          opacity: 0.92,
          filter: "blur(2px)",
        }}
      />
      {wardrobe === 2 && (
        <GuestVoid style={{ right: "-2%", top: "18%", height: "70%" }} intensity={0.9} />
      )}

      </OnWall>
      <OnWall n={1}>
      <button
        className="absolute left-[18%] top-[9%] w-[20%] touch-manipulation active:scale-[0.97]"
        aria-label="The photograph"
        onClick={() =>
          inspectItem(
            "photograph",
            "You and Mommy. Someone is standing behind you in the picture. You don't remember them.",
            3500,
          )
        }
      >
        <PhotoFrame wrong style={{ position: "static", width: "100%" }} />
      </button>
      </OnWall>
      <OnWall n={2}>
      <button
        className="absolute left-[54%] top-[14%] w-[19%] touch-manipulation active:scale-[0.97]"
        aria-label="The clock"
        onClick={() => inspectItem("clock", "The clock ticks. It is not counting forwards.", 2600)}
      >
        <Clock style={{ position: "static", width: "100%" }} />
      </button>
      </OnWall>
      <OnWall n={3}>
      <button
        className="absolute left-[20%] top-[60%] w-[21%] touch-manipulation active:scale-[0.97]"
        aria-label="The small box"
        onClick={() =>
          inspectItem(
            "trinket box",
            "Mommy's trinket box. It's locked, and it's empty — you can tell from the sound.",
            3000,
          )
        }
      >
        <TrinketBox style={{ position: "static", width: "100%" }} />
      </button>
      </OnWall>
      <OnWall n={0}>
      <button
        className="absolute left-[56%] top-[62%] w-[16%] rotate-[-8deg]"
        aria-label="A note on the rug"
        onClick={openHint}
      >
        <div className="paper px-2 py-3 font-hand text-xs">a note…</div>
      </button>

      {/* hidden drawer under the bed */}
      <div className="absolute left-[30%] top-[73%] w-[30%] overflow-visible">
        <div
          className="h-[3vh] rounded-sm transition-transform duration-700"
          style={{
            background: "linear-gradient(var(--wood-light), var(--wood))",
            transform: solved ? "translateY(60%) scale(1.15)" : "scaleY(.2)",
            opacity: solved ? 1 : 0,
          }}
        />
        {solved && !hasKey && (
          <button
            onClick={takeKey}
            aria-label="Take the key"
            className="absolute left-1/2 top-0 w-[40%] -translate-x-1/2 animate-float-up"
          >
            <Key style={{ position: "static", width: "100%" }} />
          </button>
        )}
      </div>

      {!solved && (
        <div className="absolute bottom-[3%] left-[4%] right-[4%] paper px-3 py-2.5">
          <p className="mb-1.5 text-center text-xs opacity-70">A little lock under the footboard</p>
          {/* the three dials of the lock: fill as you press, shake red on a wrong code */}
          <div
            className={`mb-2 flex justify-center gap-2 ${wrongTry ? "lock-shake" : ""}`}
            aria-live="polite"
            aria-label={wrongTry ? "Wrong code" : `Code entered: ${input.join(", ") || "none"}`}
          >
            {[0, 1, 2].map((i) => {
              const sym = (wrongTry ?? input)[i];
              return (
                <span
                  key={i}
                  className={`grid h-9 w-9 place-items-center rounded-md border-2 transition-colors ${
                    wrongTry
                      ? "border-crimson bg-crimson/15"
                      : sym
                        ? "border-wood bg-paper-deep"
                        : "border-dashed border-wood/40"
                  }`}
                >
                  {sym && (
                    <span key={`${i}-${sym}`} className="animate-float-up">
                      <Symbol
                        s={sym}
                        size={22}
                        color={wrongTry ? "var(--crimson)" : "var(--wood)"}
                      />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {PANEL.map((p) => (
              <button
                key={p}
                onClick={() => press(p)}
                disabled={!s.lightsOn}
                aria-label={p}
                className="grid aspect-square place-items-center rounded-md bg-paper-deep transition active:scale-90 active:bg-honey/60 disabled:opacity-40"
              >
                <Symbol s={p} size={30} color="var(--wood)" />
              </button>
            ))}
          </div>
        </div>
      )}
      {hasKey && (
        <button
          className="stitch-btn honey absolute bottom-[4%] left-[6%] z-20 animate-float-up"
          onClick={() => {
            sfx("open");
            s.go("ch5");
          }}
        >
          Unlock the door and run
        </button>
      )}
      </OnWall>
    </Stage>
  );
}

/* ---------------- CHAPTER 5 — BEDTIME ---------------- */
const HIDE_SPOTS = {
  bath: { label: "Look in the bathtub", x: 62, y: 54, w: 38, h: 20, clueX: 76, clueY: 61 },
  laundry: {
    label: "Look in the laundry basket",
    x: 66,
    y: 76,
    w: 29,
    h: 18,
    clueX: 79,
    clueY: 82,
  },
  towel: { label: "Look behind the towel", x: 5, y: 50, w: 23, h: 19, clueX: 15, clueY: 58 },
} as const;

type PajamaKind = "shirt" | "pants" | "socks";
const PAJAMA_PIECES: { kind: PajamaKind; name: string; icon: string }[] = [
  { kind: "shirt", name: "shirt", icon: "👕" },
  { kind: "pants", name: "pants", icon: "👖" },
  { kind: "socks", name: "socks", icon: "🧦" },
];
const PAJAMA_COLORS = ["rose", "sage", "honey", "turq"] as const;

/** v3.1 chapter 5: three pieces in the chosen color, other clothing into the basket. */
function PajamaCh5() {
  const s = useGame();
  const [worn, setWorn] = useState<PajamaKind[]>([]);
  const [inBasket, setInBasket] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("Three matching pieces. Look for your favorite color.");
  const [wrongChoices, setWrongChoices] = useState(0);
  const ended = useRef(false);
  useSceneIntro("ch5", "Choose your pajamas, then tidy the other clothes.", [
    {
      speaker: "narrator",
      text: "Your pajamas are somewhere in this heap. Mommy will be back soon.",
    },
  ]);
  const pile = PAJAMA_PIECES.flatMap((piece) =>
    PAJAMA_COLORS.map((color) => ({ ...piece, color, id: piece.kind + "-" + color })),
  );
  const allWorn = worn.length === 3;
  const otherTotal = PAJAMA_PIECES.length * (PAJAMA_COLORS.length - 1);
  useEffect(() => {
    const state = useGame.getState();
    state.set({
      objective: allWorn
        ? "Put all the other clothes in the basket."
        : "Find shirt, pants and socks in your favorite color.",
    });
  }, [allWorn]);
  useEffect(() => {
    if (ended.current || !allWorn || inBasket.length !== otherTotal) return undefined;
    ended.current = true;
    const state = useGame.getState();
    state.success();
    state.set({ interactive: false, objective: "" });
    state.say({
      speaker: "narrator",
      text: "Everything is put away. Now the house is quiet.",
      ms: 1500,
    });
    const t = window.setTimeout(() => {
      if (useGame.getState().screen === "ch5") useGame.getState().go("final");
    }, 2100);
    return () => window.clearTimeout(t);
  }, [allWorn, inBasket.length, otherTotal]);
  const pick = (garment: (typeof pile)[number]) => {
    if (!s.interactive || !s.lightsOn) return;
    if (!allWorn) {
      if (garment.color !== s.favColor) {
        sfx("wrong");
        s.mistake();
        setWrongChoices((n) => n + 1);
        setMessage("That doesn't match the color you chose earlier.");
        return;
      }
      if (worn.includes(garment.kind)) return;
      sfx("chime");
      setWorn((old) => [...old, garment.kind]);
      setMessage("You put the " + garment.name + " on. Nobody sees you changing.");
      return;
    }
    if (garment.color === s.favColor) return;
    setSelected((old) => (old === garment.id ? null : garment.id));
    sfx("tap");
  };
  const basket = () => {
    if (!selected || !allWorn || !s.interactive || !s.lightsOn) return;
    setInBasket((old) => (old.includes(selected) ? old : [...old, selected]));
    setSelected(null);
    sfx("open");
  };
  return (
    <Stage
      bg={BG.bgBathroom}
      spread
      bgPos="50% 50%"
      chapter={5}
      chapterCard
      progress={
        allWorn ? "Basket " + inBasket.length + "/" + otherTotal : "Pajamas " + worn.length + "/3"
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-[13%] top-[7%] z-10 text-xl text-crimson opacity-80"
      >
        {wrongChoices > 0 || inBasket.length >= 3 ? "👁️ 👁️" : ""}
      </div>
      <div className="absolute inset-x-[5%] top-[14%] z-10 rounded-lg border-2 border-wood bg-paper/95 p-2 text-ink shadow-xl">
        <p className="text-center font-display text-[clamp(13px,3.8cqw,18px)] font-semibold">
          {allWorn ? "Put the rest in the basket" : "Find your matching pajamas"}
        </p>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs">
          <span>Your chosen color:</span>
          <span
            className="h-4 w-7 rounded-sm border border-ink/50"
            style={{ background: "var(--c-" + s.favColor + ")" }}
          />
          <span className="font-hand">{s.favColor}</span>
        </div>
        <p className="my-1 min-h-8 text-center font-hand text-[11px]" aria-live="polite">
          {message}
        </p>
        <p className="mb-1 text-center text-xs opacity-75">Turn around: the laundry is spread across all four walls.</p>
        <div className="grid grid-cols-3 gap-2">
          {([0, 1, 2, 3] as const).map((wall) => (
            <OnWall key={wall} n={wall}>
            {pile.filter((garment) => {
              const kind = PAJAMA_PIECES.findIndex((item) => item.kind === garment.kind);
              const color = PAJAMA_COLORS.indexOf(garment.color);
              return pajamaWall(kind, color) === wall;
            }).map((garment) => {
            const used = garment.color === s.favColor && worn.includes(garment.kind);
            const away = inBasket.includes(garment.id);
            return (
              <button
                type="button"
                key={garment.id}
                disabled={used || away || !s.lightsOn || !s.interactive}
                aria-label={garment.color + " " + garment.name}
                aria-pressed={selected === garment.id}
                onClick={() => pick(garment)}
                className={
                  "flex min-h-16 touch-manipulation items-center justify-center gap-1 rounded-md border-2 px-1 py-1 text-xs transition-colors duration-100 active:scale-[0.97] disabled:opacity-30 " +
                  (selected === garment.id
                    ? "border-crimson bg-rose/30"
                    : "border-wood/40 bg-paper-deep")
                }
              >
                <span aria-hidden className="text-base">
                  {garment.icon}
                </span>
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-ink/50"
                  style={{ background: "var(--c-" + garment.color + ")" }}
                />
                <span className="sr-only">{garment.name}</span>
              </button>
            );
          })}
            </OnWall>
          ))}
        </div>
        <p className="mt-2 text-center text-xs">
          Wearing {worn.length}/3 · Basket {inBasket.length}/{otherTotal}
        </p>
      </div>
      <button
        type="button"
        onClick={basket}
        disabled={!selected || !s.lightsOn || !s.interactive}
        aria-label="Place selected clothing into the laundry basket"
        className="stitch-btn honey absolute bottom-[3%] left-1/2 z-10 min-h-12 w-[72%] -translate-x-1/2 disabled:opacity-50"
      >
        🧺 {selected ? "Put selected clothing away" : "Laundry basket"}
      </button>
    </Stage>
  );
}

export function Ch5() {
  return <PajamaCh5 />;
}

/** Archived previous version, kept for reference until QA of the new bedroom/bathroom. */
export function LegacyCh5() {
  const s = useGame();
  const incomingPlan = useAdaptiveChapter(5);
  const plan = useRef(incomingPlan).current;
  const toy = s.favToyVisualSlot ?? s.favToyId ?? s.facts.firstToy ?? s.toyOrder[0];
  const toyImage = toyImageFor(toy, s.favToyVisualSlot, s.favToyImage);
  const toyLabel = s.favToy ?? TOY_LABEL[toy];
  const [brush, setBrush] = useState(0); // 0 no brush, 1 holding, 2 done
  const [scrub, setScrub] = useState(0);
  const [pj, setPj] = useState(false);
  const [sawClue, setSaw] = useState(false);
  const [found, setFound] = useState(false);
  const [livePressure, setLivePressure] = useState(plan.blackoutPressure);
  const lastX = useRef<number | null>(null);
  const ended = useRef(false);
  const aiLineSpoken = useRef(false);
  const searchStartRequested = useRef(false);
  const searchMissRequested = useRef(false);
  const chapterStartedAt = useRef(Date.now());
  const timingStarted = useRef(false);
  const brushStartedAt = useRef(Date.now());
  const scrubRecorded = useRef(false);
  const searchStartedAt = useRef(Date.now());

  const hidingSpot = HIDE_SPOTS[plan.hidingPlace];

  useSceneIntro(
    "ch5",
    "Get ready for bed: teeth, pyjamas, and your toy.",
    [
      {
        speaker: "narrator",
        text: "The bathroom. Mommy will be home any minute. Be in bed when she is.",
      },
      ...chooseInterventions(s.facts, 5)
        .filter((i) => i.kind === "line")
        .map((i) => ({ speaker: "guest" as const, text: (i as { text: string }).text })),
    ],
    () => startMusic(),
  );

  useEffect(() => {
    if (!s.interactive || timingStarted.current) return;
    timingStarted.current = true;
    chapterStartedAt.current = Date.now();
  }, [s.interactive]);

  useEffect(() => {
    if (plan.provider !== "gemini" || aiLineSpoken.current) return;
    aiLineSpoken.current = true;
    useGame.getState().say({ speaker: "guest", text: plan.guestLine });
  }, [plan]);

  // Mommy's list keeps track of what's still left before bed.
  const todo = [brush < 2 && "teeth", !pj && "pyjamas", !found && toyLabel].filter(
    (t): t is string => !!t,
  );
  const searching = brush === 2 && pj && !found;
  const toyName = s.favToy ?? `your ${TOY_LABEL[toy]}`;
  useEffect(() => {
    if (found) return;
    s.set({
      objective: !searching
        ? `Get ready for bed. Still to do: ${todo.join(", ")}.`
        : sawClue
          ? `You saw where ${toyName} is. Turn the light on and look there.`
          : `Find ${toyName}. Turn the light off and search the room with your light.`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo.join(), searching, sawClue]);

  useEffect(() => {
    if (!searching || searchStartRequested.current) return;
    searchStartRequested.current = true;
    searchStartedAt.current = Date.now();
    const requestPhase = useGame.getState().phaseKey;
    useGame.getState().success(Date.now() - chapterStartedAt.current);
    void runAdaptiveMoment(5, "tasks_complete", "bedtime-tasks", {
      recentMistakes: 0,
      elapsedMs: Date.now() - chapterStartedAt.current,
    }).then((decision) => {
      const state = useGame.getState();
      if (state.screen !== "ch5" || state.phaseKey !== requestPhase) return;
      setLivePressure(
        decision.action === "ease"
          ? "merciful"
          : decision.action === "escalate"
            ? "relentless"
            : plan.blackoutPressure,
      );
      if (decision.action === "escalate") state.set({ flicker: Date.now() });
      state.say({ speaker: "guest", text: decision.line, ms: 3000 });
    });
  }, [searching, plan.blackoutPressure]);

  // The house turns the light off on its own after the first two tasks.
  useEffect(() => {
    if (brush < 2 || !pj || found) return;
    s.say({ speaker: "narrator", text: `Where is ${toyLabel}? You can't sleep without it.` });
    const probability =
      livePressure === "merciful" ? 0.18 : livePressure === "relentless" ? 0.58 : 0.35;
    const id = window.setInterval(() => {
      const st = useGame.getState();
      if (st.lightsOn && st.interactive && !st.paused && !st.scare && Math.random() < probability) {
        sfx("switch");
        st.set({ lightsOn: false, flicker: Date.now() });
      }
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brush, pj, found, livePressure, toyLabel]);

  // Reading the mirror in the dark requires actually shining the light on it.
  useEffect(() => {
    if (s.lightsOn || sawClue || brush < 2 || !pj) return;
    const id = window.setInterval(() => {
      if (illuminated(hidingSpot.clueX, hidingSpot.clueY, 5)) setSaw(true);
    }, 200);
    return () => window.clearInterval(id);
  }, [s.lightsOn, sawClue, brush, pj, hidingSpot]);

  const onScrub = (e: React.PointerEvent) => {
    if (brush !== 1) return;
    if (lastX.current !== null)
      setScrub((v) => {
        const n = Math.min(100, v + Math.abs(e.clientX - lastX.current!) / 6);
        if (n >= 100 && v < 100) {
          setBrush(2);
          sfx("chime");
          if (!scrubRecorded.current) {
            scrubRecorded.current = true;
            useGame.getState().success(Date.now() - brushStartedAt.current);
          }
        }
        return n;
      });
    lastX.current = e.clientX;
  };

  const search = (place: keyof typeof HIDE_SPOTS) => {
    if (!s.lightsOn) return;
    if (!sawClue) {
      s.say({
        speaker: "narrator",
        text: "Nothing there. In the dark, something was trying to show you.",
        ms: 2200,
      });
      return;
    }
    const choice =
      place === "bath" ? "the bathtub" : place === "laundry" ? "the laundry basket" : "the towel";
    s.observeChoice(choice);
    if (place !== plan.hidingPlace) {
      s.mistake();
      sfx("wrong");
      s.say({ speaker: "narrator", text: "Empty. The Guest moved it somewhere else.", ms: 1800 });
      if (!searchMissRequested.current) {
        searchMissRequested.current = true;
        const requestPhase = useGame.getState().phaseKey;
        void runAdaptiveMoment(5, "search_miss", "first-search-miss", {
          recentMistakes: 1,
          choice,
          elapsedMs: Date.now() - chapterStartedAt.current,
        }).then((decision) => {
          const state = useGame.getState();
          if (state.screen !== "ch5" || state.phaseKey !== requestPhase) return;
          if (decision.action === "ease") setLivePressure("merciful");
          if (decision.action === "escalate") {
            setLivePressure("relentless");
            state.set({ flicker: Date.now() });
          }
          state.say({ speaker: "guest", text: decision.line, ms: 3000 });
        });
      }
      return;
    }
    s.success(Date.now() - searchStartedAt.current);
    setFound(true);
    sfx("chime");
  };

  useEffect(() => {
    if (found && !ended.current) {
      ended.current = true;
      const c = useGame.getState().cordura;
      s.set({ finalCordura: c, interactive: false, objective: "" });
      s.say([
        {
          speaker: "narrator",
          text: `${toyLabel} was ${plan.hidingPlace === "bath" ? "in the bath, cold and damp" : plan.hidingPlace === "laundry" ? "under the laundry, wrapped too carefully" : "behind the towel, still warm"}.`,
        },
      ]);
      window.setTimeout(() => {
        sfx("switch");
        useGame.getState().go("final");
      }, 4500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  return (
    <Stage
      bg={BG.bgBathroom}
      bgPos="50% 50%"
      chapter={5}
      chapterCard
      progress={`Ready ${3 - todo.length}/3`}
      switchHint={searching && (s.lightsOn ? !sawClue : sawClue)}
      above={
        <>
          {brush === 0 && <Hint x={41} y={40} w={12} h={10} label="toothbrush" />}
          {brush === 1 && (
            <Hint x={14} y={46} w={44} h={16} label="scrub ← →" ring={false} labelTop />
          )}
          {!pj && <Hint x={30} y={79} w={30} h={12} label="pyjamas" />}
          {searching &&
            Object.entries(HIDE_SPOTS).map(([id, spot]) => (
              <Hint key={id} x={spot.x} y={spot.y} w={spot.w} h={spot.h} faint />
            ))}
        </>
      }
      clues={
        brush === 2 &&
        pj &&
        !found && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${hidingSpot.clueX}%`, top: `${hidingSpot.clueY}%`, width: "18%" }}
          >
            <img
              src={toyImage}
              alt=""
              className="w-full opacity-80"
              style={{ filter: "saturate(.4) brightness(1.2) drop-shadow(0 0 8px var(--glow))" }}
            />
            <GuestVoid style={{ left: "5%", top: "-70%", height: "180%" }} intensity={0.8} />
          </div>
        )
      }
    >
      {/* toothbrush cup */}
      {brush === 0 && (
        <button
          aria-label="Take your toothbrush"
          className="absolute left-[41%] top-[40%] h-[10%] w-[12%]"
          onClick={() => {
            brushStartedAt.current = Date.now();
            s.observeChoice("toothbrush");
            setBrush(1);
            sfx("tap");
            s.say({ speaker: "narrator", text: "Scrub back and forth over the sink.", ms: 2200 });
          }}
        />
      )}
      {brush === 1 && (
        <div
          className="absolute left-[14%] top-[46%] h-[16%] w-[44%] touch-none rounded-[40%] border-2 border-dashed border-paper/50"
          onPointerMove={onScrub}
          onPointerLeave={() => (lastX.current = null)}
        >
          <Toothbrush style={{ left: `${20 + (scrub % 20) * 3}%`, top: "5%", height: "90%" }} />
          <div className="absolute -bottom-5 left-0 h-1.5 w-full rounded bg-paper/30">
            <div className="h-full rounded bg-turq" style={{ width: `${scrub}%` }} />
          </div>
        </div>
      )}
      {/* pyjamas */}
      {!pj && (
        <button
          aria-label="Put on your pyjamas"
          className="absolute left-[30%] top-[79%] w-[30%]"
          onClick={() => {
            s.observeChoice("pyjamas");
            setPj(true);
            sfx("open");
          }}
        >
          <Pajamas color={`var(--c-${s.favColor})`} style={{ position: "static", width: "100%" }} />
        </button>
      )}
      {(
        Object.entries(HIDE_SPOTS) as Array<
          [keyof typeof HIDE_SPOTS, (typeof HIDE_SPOTS)[keyof typeof HIDE_SPOTS]]
        >
      ).map(([id, spot]) => (
        <button
          key={id}
          aria-label={spot.label}
          className="absolute"
          style={{
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            width: `${spot.w}%`,
            height: `${spot.h}%`,
          }}
          onClick={() => search(id)}
          disabled={brush < 2 || !pj}
        />
      ))}
    </Stage>
  );
}
